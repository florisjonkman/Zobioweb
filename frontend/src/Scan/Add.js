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

import SelectProject from "./Pages/SelectProject";
import ScanItems from "./Pages/ScanItems";
import ItemsSubmitted from "./Pages/ItemsSubmitted";
import PrintLabels from "./Pages/PrintLabels";
import MySnackbar from "./Components/MySnackbar";
import MyDialog from "./Components/MyDialog";

import {
  fetchSendData,
  fetchProjects,
  fetchPosition,
  fetchLastPosition,
} from "./Functions/ApiFunctions";
import {
  isBarcodeUnique,
  formatDate,
  posIntegerToString,
  posStringToInteger,
  nextLocation,
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
  const [allItemsSubmitted, setAllItemsSubmitted] = useState(false); // bool, did the submission of all items succeed
  const [failedSubmittedItems, setFailedSubmittedItems] = useState([]); // dic, data of failed submitted items

  // Location of vials states
  const [lastLocation, setLastLocation] = useState([null, null]); // list [int, int], last occupied position of project, DYNAMIC
  const [firstLocation, setFirstLocation] = useState([null, null]); // list [int, int], last occupied position as in CDD, STATIC

  // Data states
  const [data, setData] = useState([]); // dic, data of all scanned items
  const [projects, setProjects] = useState([
    {
      value: 0,
      id: 0,
      name: "",
    },
  ]); // dic, data of projects, 0 is no project
  const [selectedProject, setSelectecProject] = useState(projects[0]); // dic, data of selected project

  // Load the projects from Database, only once
  useEffect(() => {
    setIsLoading(true);
    fetchProjects()
      .then((response) => {
        console.log(response);
        if (response.status === 200 && response.statusText === "OK") {
          console.log(response.data["message"]);
          const array = projects.concat(response.data["output"]["projects"]);
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
        if (error.response) {
          console.error(
            `ERROR fetchProjects(), status: ${error.response.status}, statusText: ${error.response.statusText}, message: '${error.response.data["message"]}'`
          );
        } else {
          console.error(error);
        }
        setIsLoading(false);
      });
  }, []);

  // Load the last filled location of the project from Database
  useEffect(() => {
    if (selectedProject.value !== 0) {
      setIsLoading(true);
      fetchLastPosition(selectedProject)
        .then((response) => {
          console.log(response);
          if (
            response &&
            response.status === 200 &&
            response.statusText === "OK"
          ) {
            console.log(response.data["message"]);
            const [lastBox, lastPos] = response.data["output"][
              "last location"
            ].slice(1, 3);
            setFirstLocation([lastBox, lastPos]);
            setLastLocation([lastBox, lastPos]);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          if (error.response) {
            console.error(
              `ERROR fetchLastPosition(), status: ${error.response.status}, statusText: ${error.response.statusText}, message: '${error.response.data["message"]}'`
            );
          } else {
            console.error(error);
          }
          setIsLoading(false);
        });
    }
  }, [selectedProject]);

  // When project changed, delete all data
  const handleProjectChange = (event) => {
    setSelectecProject(projects[event.target.value]);
    setData([]);
    setOpenSnackbar(false);
  };

  // Data is changed (delete button clicked)
  const handleDataChanged = (newData) => {
    let box;
    let pos;
    newData.forEach((item, index) => {
      newData[index].id = index + 1; // Renumber indeces
      box = newData[index].box; // Select last box
      pos = posStringToInteger(newData[index].poslabel); // Select last position
    });

    // Get last location
    const lastBox = lastLocation[0];
    const lastPos = lastLocation[1];

    if (!pos && !box) {
      // Empty array, all items are deleted, return to first location from Database
      setLastLocation(firstLocation);
    } else if (!(box === lastBox && pos === lastPos)) {
      // If last location in data is NOT equal to lastLocation, reset lastLocation
      setLastLocation([box, pos]);
      console.log(
        "Latest position NOT the same as lastLocation",
        `box: ${lastBox} -> ${box}, pos: ${lastPos} -> ${pos}`
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

        if (response.status === 200 && response.statusText === "OK") {
          if (!response.data["output"]["isInCDD"]) {
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
          if (!response.data["output"]["isInCorrectProject"]) {
            setDataSnackbar({
              type: "error",
              title: "Error",
              body: (
                <React.Fragment>
                  <strong>{barcode}</strong>
                  {" found in different project: "}
                  <strong>
                    {response.data["output"]["vialData"]["project"]["name"]}
                  </strong>
                </React.Fragment>
              ),
            });
            setIsLoading(false);
            setOpenSnackbar(true);
            return;
          }
          if (!response.data["output"]["isCorrectStatus"]) {
            setDataSnackbar({
              type: "error",
              title: "Error",
              body: (
                <React.Fragment>
                  <strong>{barcode}</strong>
                  {" has incorrect status: "}
                  <strong>
                    {response.data["output"]["vialData"]["Status"]}
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

          const id = data.length + 1;
          const project = selectedProject;
          const [box, pos] = nextLocation(lastLocation[0], lastLocation[1]);
          const poslabel = posIntegerToString(pos);
          const status = response.data["output"]["vialData"]["Status"];
          const timestamp = formatDate(new Date(Date.now()));
          const username = Cookies.get("username");
          const fullname = Cookies.get("fullname");
          const newData = data;

          newData.push({
            id,
            barcode,
            project,
            box,
            poslabel,
            status,
            timestamp,
            username,
            fullname,
          });

          setData(newData); // Update data

          setLastLocation([box, pos]); // Update last location

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
        return;
      })
      .catch((error) => {
        if (error.response) {
          console.error(
            `ERROR fetchPosition(), status: ${error.response.status}, statusText: ${error.response.statusText}, message: '${error.response.data["message"]}'`
          );
        } else {
          console.error(error);
        }
        setIsLoading(false);
        return;
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
    } else if (activeStep === 1 && data.length === 0) {
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
    setActiveStep(activeStep - 1);
  };

  // Print button is clicked
  const handlePrint = () => {
    console.log("Add: handlePrint: printing data");
    console.log(data);
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
  const handleYesDialog = async () => {
    handleNext();
    setOpenDialog(false);
    setIsLoading(true);

    fetchSendData("Add", data)
      .then((response) => {
        console.log(response);
        if (response.status === 200 && response.statusText === "OK") {
          console.log(response.data["message"]);
          if (response.data["output"]["success"]) {
            setAllItemsSubmitted(true);
          } else {
            setAllItemsSubmitted(false);
            setFailedSubmittedItems(response.data["output"]["failedVials"]);
          }
        } else {
          console.error("ERROR: Request succeeded, but status not 200");
          console.error(response);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        if (error.response) {
          console.error(
            `ERROR fetchSendData(), status: ${error.response.status}, statusText: ${error.response.statusText}, message: '${error.response.data["message"]}'`
          );
        } else {
          console.error(error);
        }
        setIsLoading(false);
      });
  };

  // Labels of steps
  const steps = ["Select project", "Scan items", "Print Labels"];

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
          <ScanItems
            data={data}
            selectedProject={selectedProject}
            onDataChange={handleDataChanged}
            onBarcodeSubmitted={handleBarcodeSubmitted}
            isLoading={isLoading}
          />
        );
      case 2:
        return <PrintLabels />;
      case 3:
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

    if (step !== 0 && step !== 3) {
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
    if (step === 2) {
      contents.push(
        <Button
          key="button_printlabel"
          name="button_printlabel"
          onClick={handlePrint}
          variant="contained"
          color="secondary"
          className={classes.button}
        >
          Print Labels
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
        >
          Submit
        </Button>
      );
    }
    if (step === 0 || step === 1) {
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

    if (step === 3)
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

  //   console.log(stackLocked);
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
              <MyDialog
                open={openDialog}
                data={{
                  title:
                    "Are you sure you want to submit the scanned items to CDD?",
                  body: "The labels must be printed before submitting to CDD.",
                }}
                handleDialog={handleDialog}
                handleYesDialog={handleYesDialog}
              />
            </React.Fragment>
          </React.Fragment>
        </Paper>
      </main>
    </React.Fragment>
  );
}

export default Add;
