import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Cookies from "js-cookie";

import CssBaseline from "@material-ui/core/CssBaseline";
import Paper from "@material-ui/core/Paper";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

import SelectProject from "./Pages/SelectProject";
import SelectContainer from "./Pages/SelectContainer";
import ScanItems from "./Pages/ScanItems";
import ItemsSubmitted from "./Pages/ItemsSubmitted";
import PrintLabels from "./Pages/PrintLabels";
import MySnackbar from "./Components/MySnackbar";
import MyDialog from "./Components/MyDialog";
import containerTypes from "./Elements/containerTypes.json";

import {
  fetchSendData,
  fetchProjects,
  fetchPosition,
  fetchLastPosition,
  fetchPrintLabels,
} from "../ApiFunctions";
import {
  isBarcodeUnique,
  generateContainerBarcode,
  posIntegerToString,
  posStringToInteger,
  calculateNextLocation,
} from "./Functions/ScanFunctions";

// Styles
const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
  },
  layout: {
    width: "auto",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
      maxWidth: 1200,
      marginLeft: "auto",
      marginRight: "auto",
    },
  },
  paper: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(3) * 2)]: {
      marginTop: theme.spacing(6),
      marginBottom: theme.spacing(6),
      padding: theme.spacing(3),
    },
  },
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
  buttons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  button: {
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(1),
  },
}));

function Add({ handleChangePage }) {
  // Styles
  const classes = useStyles();

  // Page states
  const [activeStep, setActiveStep] = useState(0); // int, stepper: 1,2,3,4,5
  const [isLoading, setIsLoading] = useState(false); // bool, is the page loading
  const [openSnackbar, setOpenSnackbar] = useState(false); // bool, open the snackbar
  const [dataSnackbar, setDataSnackbar] = useState({
    type: "error",
    title: null,
    body: null,
  });
  const [openDialog, setOpenDialog] = useState(false); // bool, open the dialog window

  // Data submition states
  const [allItemsSubmitted, setAllItemsSubmitted] = useState(false); // bool, did the submission of all items succeeded
  const [failedSubmittedItems, setFailedSubmittedItems] = useState([]); // dic, data of failed submitted items
  const [isPrintFileSend, setIsPrintFileSend] = useState(false);

  // Data states

  // Location of vials states
  const [firstLocation, setFirstLocation] = useState([0, 0, 0]); // list [int, int, int], last occupied position as in CDD, this is what CDD knows about this project
  const [lastLocation, setLastLocation] = useState([0, 0, 0]); // list [int, int, int], last occupied position in scanned list
  const [nextLocation, setNextLocation] = useState([0, 0, 0]); // list [int, int, int], next location to be occupied, changes when more items scanned
  const [firstLocationBatchData, setFirstLocationBatchData] = useState({}); // batch data of last
  // first, last and next seems to have strange names here, to explain
  // * firstLocation, the last known location in CDD which is occupied, this is thus always the first occupied location for the scanned, when all scanned are removed, the lastLocation becomes the firstLocation
  // * lastLocation, the last location occupied by the scanned items in the list
  // * nextLocation, the location after the lastLocation

  // Scan and project data states
  const [data, setData] = useState([]); // dic, data of all scanned items
  const [projects, setProjects] = useState([
    {
      value: 0,
      id: 0,
      name: "",
    },
  ]); // dic, data of projects, 0 is no project
  const [containers, setContainers] = useState([]); // dic, data of all containers, please check containerTypes.json
  const [selectedProject, setSelectedProject] = useState(projects[0]); // dic, data of selected project
  const [selectedContainer, setSelectedContainer] = useState(null); // dic, data of selected container, please check containerTypes.json
  const [selectedContainerBarcode, setSelectedContainerBarcode] = useState(""); // string, container barcode

  // Reset all data states
  const resetDataStates = (includingProject = true) => {
    console.log(
      "Reset data states, ",
      includingProject ? "including project" : "without project"
    );
    setFirstLocation([0, 0, 0]);
    setLastLocation([0, 0, 0]);
    setNextLocation([0, 0, 0]);
    setFirstLocationBatchData({});
    setData([]);
    setSelectedContainer(null);
    setSelectedContainerBarcode("");
    if (includingProject) {
      setSelectedProject(projects[0]);
    }
  };

  // Read all containertypes from JSON file and store them in dictionary, only once
  useEffect(() => {
    let newContainers = [];
    containerTypes.forEach((item) => {
      newContainers.push(item);
    });
    setContainers(newContainers);
  }, []);

  // Load the projects from database, only once
  useEffect(() => {
    setIsLoading(true);
    fetchProjects()
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          console.log(response.data["backendRequest"]["response"]["message"]);
          const array = projects.concat(
            response.data["backendRequest"]["response"]["output"]["projects"]
          );
          array.forEach((item, index) => {
            array[index].value = index;
          });
          setProjects(array);
        } else {
          console.error("ERROR: Request succeeded, but status not 200");
          console.error(response);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (error.response) console.error(error.response);
        setIsLoading(false);
      });
  }, []);

  // Load the last filled location of the project from Database, when selected project is changed
  useEffect(() => {
    if (selectedProject.value !== 0) {
      // Only if project is selected
      setIsLoading(true);
      fetchLastPosition(selectedProject)
        .then((response) => {
          console.log(response);
          if (response && response.status === 200) {
            // Correct backend response, print message
            console.log(response.data["backendRequest"]["response"]["message"]);

            if (
              !response.data["backendRequest"]["response"]["output"][
                "hasLastLocation"
              ]
            ) {
              // Project is new, and does not have a occupied location yet
              resetDataStates(false);
              setIsLoading(false);
              return;
            }

            let container = null;
            containers.forEach((containerData) => {
              // Loop over all containertypes
              if (
                response.data["backendRequest"]["response"]["output"]["batch"][
                  "batch_fields"
                ]["Container type"] === containerData.name
              ) {
                // Containertype of Batch, corresponds to known types in containerTypes.json
                container = containerData;
                setSelectedContainer(containerData);
                setSelectedContainerBarcode(
                  response.data["backendRequest"]["response"]["output"][
                    "batch"
                  ]["batch_fields"]["Container barcode"]
                );
              }
            });

            if (!container) {
              console.error(
                `Container type: ${response.data["backendRequest"]["response"]["output"]["batch"]["batch_fields"]["Container type"]} not found in CDD. Check if boxTypes.json has the correct types and spelling as in CDD.`
              );
            } else {
              // Container found, set all data
              const [lastBox, lastRow, lastCol] = response.data[
                "backendRequest"
              ]["response"]["output"]["lastLocation"].slice(1, 4);
              setFirstLocation([lastBox, lastRow, lastCol]);
              setLastLocation([lastBox, lastRow, lastCol]);
              setNextLocation(
                calculateNextLocation(
                  lastBox,
                  lastRow,
                  lastCol,
                  container.rows,
                  container.columns
                )
              );
              setFirstLocationBatchData(
                response.data["backendRequest"]["response"]["output"]["batch"][
                  "batch_fields"
                ]
              );
            }
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error(error);
          if (error.response) console.error(error.response);
          setIsLoading(false);
        });
    }
  }, [selectedProject]);

  // When project changed, delete all data
  const handleProjectChange = (event) => {
    resetDataStates();
    setSelectedProject(projects[event.target.value]);
    setOpenSnackbar(false);
  };

  // When container changed
  const handleContainerChange = (containerData) => {
    const [firstBox] = firstLocation;

    setSelectedContainer(containerData); // Set new contaier type
    setNextLocation([firstBox + 1, 1, 1]); // Next location is, previous box + 1

    setOpenSnackbar(false);
    handleNext();
  };

  // Data is changed (delete button clicked)
  const handleDataChanged = (newData) => {
    let box, row, col;
    newData.forEach((item, index) => {
      newData[index].id = index + 1; // Renumber indeces
      box = newData[index].box; // Select last box
      [row, col] = posStringToInteger(newData[index].poslabel); // Select last position
    });

    // Get last location
    const [lastBox, lastRow, lastCol] = lastLocation;

    if (!box && !row && !col) {
      // Empty array, all items are deleted, return to first location from Database
      const [firstBox, firstRow, firstCol] = firstLocation;
      setSelectedContainerBarcode(
        generateContainerBarcode(firstBox, selectedProject.name)
      );
      setLastLocation(firstLocation);
      setNextLocation(
        calculateNextLocation(
          firstBox,
          firstRow,
          firstCol,
          selectedContainer.rows,
          selectedContainer.columns
        )
      );
    } else if (!(box === lastBox && row === lastRow && col === lastCol)) {
      // If last location in data is NOT equal to lastLocation, reset lastLocation
      setLastLocation([box, row, col]);
      setSelectedContainerBarcode(
        generateContainerBarcode(box, selectedProject.name)
      );
      setNextLocation(
        calculateNextLocation(
          box,
          row,
          col,
          selectedContainer.rows,
          selectedContainer.columns
        )
      );

      console.log(
        "Latest position NOT the same as lastLocation",
        `box: ${lastBox} -> ${box}, row: ${lastRow} -> ${row}, col: ${lastCol} -> ${col}`
      );
    }

    setData(newData);
  };

  const handleBarcodeSubmitted = (barcode) => {
    setOpenSnackbar(false);

    if (!isBarcodeUnique(data, barcode)) {
      // Barcode not unique
      setDataSnackbar({
        type: "error",
        title: "Error",
        body: "Barcode already scanned.",
      });
      setOpenSnackbar(true);
      return;
    }

    setIsLoading(true);
    fetchPosition("Add", barcode, selectedProject)
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          if (
            !response.data["backendRequest"]["response"]["output"]["isInCDD"]
          ) {
            setDataSnackbar({
              type: "error",
              title: "Error",
              body: (
                <React.Fragment>
                  <strong>{barcode}</strong>
                  {" not found in CDD Vault."}
                </React.Fragment>
              ),
            });
            setIsLoading(false);
            setOpenSnackbar(true);
            return;
          }
          if (
            !response.data["backendRequest"]["response"]["output"][
              "isInCorrectProject"
            ]
          ) {
            setDataSnackbar({
              type: "error",
              title: "Error",
              body: (
                <React.Fragment>
                  <strong>{barcode}</strong>
                  {" found in different project: "}
                  <strong>
                    {
                      response.data["backendRequest"]["response"]["output"][
                        "batchData"
                      ]["projects"][0]["name"]
                    }
                  </strong>
                </React.Fragment>
              ),
            });
            setIsLoading(false);
            setOpenSnackbar(true);
            return;
          }
          if (
            !response.data["backendRequest"]["response"]["output"][
              "isCorrectStatus"
            ]
          ) {
            setDataSnackbar({
              type: "error",
              title: "Error",
              body: (
                <React.Fragment>
                  <strong>{barcode}</strong>
                  {" has incorrect status: "}
                  <strong>
                    {
                      response.data["backendRequest"]["response"]["output"][
                        "batchData"
                      ]["batch_fields"]["Status"]
                    }
                  </strong>
                  {"."}
                  <br />
                  {"Only vials with status 'Registered' can be added."}
                </React.Fragment>
              ),
            });
            setIsLoading(false);
            setOpenSnackbar(true);
            return;
          }
          const [lastBox] = lastLocation;
          const [box, row, col] = nextLocation;
          let containerbarcode;
          if (lastBox < box) {
            containerbarcode = generateContainerBarcode(
              box,
              selectedProject.name
            );
            setSelectedContainerBarcode(containerbarcode);
          } else {
            containerbarcode = selectedContainerBarcode;
          }

          const id = data.length + 1;
          const project = selectedProject;
          const poslabel = posIntegerToString(row, col);
          const status =
            response.data["backendRequest"]["response"]["output"]["batchData"][
              "batch_fields"
            ]["Status"];
          const fullname = Cookies.get("fullname");
          const containertype = selectedContainer.name;
          const newData = data;

          newData.push({
            id,
            barcode,
            project,
            box,
            poslabel,
            status,
            fullname,
            containerbarcode,
            containertype,
          });

          setData(newData); // Update data

          setLastLocation([box, row, col]); // Update last location
          setNextLocation(
            calculateNextLocation(
              box,
              row,
              col,
              selectedContainer.rows,
              selectedContainer.columns
            )
          );

          // Give success snackbar
          setDataSnackbar({
            type: "success",
            title: "Success",
            body: (
              <React.Fragment>
                <strong>{barcode}</strong>
                {" to "}
                <strong>{box + "-" + poslabel}</strong>
              </React.Fragment>
            ),
          });
          setOpenSnackbar(true);
        } else {
          console.error("ERROR: Request succeeded, but status not 200");
          console.error(response);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (error.response) console.error(error.response);
        setIsLoading(false);
      });
  };

  // Next button is clicked
  const handleNext = () => {
    if (activeStep === 0 && selectedProject.value === 0) {
      // If no project is selected, give error
      setDataSnackbar({
        type: "error",
        title: "Error",
        body: "No project selected.",
      });
      setOpenSnackbar(true);
    } else if (activeStep === 2 && data.length === 0) {
      // No data in input
      setDataSnackbar({
        type: "error",
        title: "Error",
        body: "No items scanned.",
      });
      setOpenSnackbar(true);
    } else {
      // Else continue
      setActiveStep(activeStep + 1);
    }
  };

  // Back button is clicked
  const handleBack = () => {
    if (activeStep === 2) {
      setOpenDialog(true);
    } else {
      setActiveStep(activeStep - 1);
    }
  };

  // Print button is clicked
  const handlePrint = () => {
    console.log("Add: handlePrint: printing data");
    console.log(data);

    setIsLoading(true);
    fetchPrintLabels(data)
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          setIsPrintFileSend(true);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (error.response) console.error(error.response);
        setIsLoading(false);
      });
  };

  // Function if snackbar should be opened/closed
  const handleSnackbar = () => {
    if (openSnackbar) {
      setOpenSnackbar(false);
    } else {
      setOpenSnackbar(true);
    }
  };

  // Function if dialog should be opened/closed
  const handleDialog = () => {
    if (openDialog) {
      setOpenDialog(false);
    } else {
      setOpenDialog(true);
    }
  };

  // If 'Yes' button in dialog at step 4 is clicked, so submit results
  const handleSendDataToCDD = async () => {
    handleNext();
    setOpenDialog(false);
    setIsLoading(true);

    fetchSendData("Add", data)
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          console.log(response.data["backendRequest"]["response"]["message"]);
          if (
            response.data["backendRequest"]["response"]["output"]["success"]
          ) {
            setAllItemsSubmitted(true);
          } else {
            setAllItemsSubmitted(false);
            setFailedSubmittedItems(
              response.data["backendRequest"]["response"]["output"][
                "failedVials"
              ]
            );
          }
        } else {
          console.error("ERROR: Request succeeded, but status not 200");
          console.error(response);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (error.response) console.error(error.response);
        setIsLoading(false);
      });
  };

  // Labels of steps
  const steps = [
    "Select project",
    "Select container",
    "Scan barcodes",
    "Print Labels",
  ];

  function getStepContent(step) {
    switch (step) {
      case 0:
        return (
          <SelectProject
            selectedProject={selectedProject}
            projects={projects}
            onProjectChange={handleProjectChange}
            isLoading={isLoading}
          />
        );
      case 1:
        return (
          <SelectContainer
            selectedProject={selectedProject}
            selectedContainer={selectedContainer}
            firstLocation={firstLocation}
            firstLocationBatchData={firstLocationBatchData}
            containers={containers}
            onContainerChange={handleContainerChange}
            isLoading={isLoading}
            handleNext={handleNext}
          />
        );
      case 2:
        return (
          <ScanItems
            data={data}
            selectedProject={selectedProject}
            onDataChange={handleDataChanged}
            onBarcodeSubmitted={handleBarcodeSubmitted}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <PrintLabels
            isLoading={isLoading}
            isPrintFileSend={isPrintFileSend}
          />
        );
      case 4:
        return (
          <ItemsSubmitted
            isLoading={isLoading}
            allItemsSubmitted={allItemsSubmitted}
            failedSubmittedItems={failedSubmittedItems}
          />
        );
      default:
        return <React.Fragment> Error: this step not found. </React.Fragment>;
    }
  }

  function getButtonContent(step) {
    let contents = [];

    if (step !== 0 && step !== 4) {
      contents.push(
        <Button
          key="button_back"
          name="button_back"
          onClick={handleBack}
          // variant="contained"
          className={classes.button}
        >
          Back
        </Button>
      );
    }
    if (step === 3) {
      contents.push(
        <Button
          key="button_printlabel"
          name="button_printlabel"
          onClick={handlePrint}
          variant="contained"
          color="secondary"
          className={classes.button}
          disabled={isLoading}
        >
          Print
        </Button>
      );
      contents.push(
        <Button
          variant="contained"
          name="button_submit"
          key="button_submit"
          color="primary"
          onClick={handleDialog}
          className={classes.button}
          disabled={isLoading}
        >
          Submit
        </Button>
      );
    }
    if (step === 0 || step === 2) {
      contents.push(
        <Button
          variant="contained"
          name="button_next"
          key="button_next"
          color="primary"
          onClick={handleNext}
          className={classes.button}
        >
          Next
        </Button>
      );
    }
    if (step === 4)
      contents.push(
        <Button
          variant="contained"
          name="button_end"
          key="button_end"
          color="primary"
          onClick={() => {
            handleChangePage("Home");
          }}
          className={classes.button}
        >
          End
        </Button>
      );

    return contents;
  }

  function getDialogContent(step) {
    switch (step) {
      case 3:
        return (
          <MyDialog
            open={openDialog}
            data={{
              title: "Are you sure you want to add the scanned vials to CDD?",
              body: "All labels must me printed before sending data to CDD.",
            }}
            handleNo={handleDialog}
            handleYes={handleSendDataToCDD}
          />
        );
      case 2:
        return (
          <MyDialog
            open={openDialog}
            data={{
              title: "Are you sure you want to go back?",
              body: "All scanned data will be deleted.",
            }}
            handleNo={handleDialog}
            handleYes={() => {
              resetDataStates(true);
              handleDialog();
              setActiveStep(0);
            }}
          />
        );
      default:
        return <React.Fragment></React.Fragment>;
    }
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <main className={classes.layout}>
        <Paper className={classes.paper}>
          <Typography component="h1" variant="h4" align="center">
            Add
          </Typography>
          <Stepper activeStep={activeStep} className={classes.stepper}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <React.Fragment>
            <React.Fragment>
              {getStepContent(activeStep)}
              <div className={classes.buttons}>
                {getButtonContent(activeStep)}
              </div>
              <MySnackbar
                open={openSnackbar}
                data={dataSnackbar}
                handleSnackbar={handleSnackbar}
              />
              {getDialogContent(activeStep)}
            </React.Fragment>
          </React.Fragment>
        </Paper>
      </main>
    </React.Fragment>
  );
}

export default Add;
