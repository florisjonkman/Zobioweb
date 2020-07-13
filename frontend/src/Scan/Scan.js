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
import MySnackbar from "./Components/MySnackbar";
import MyDialog from "./Components/MyDialog";

import { fetchSendData, fetchProjects, fetchPosition } from "../ApiFunctions";
import { isBarcodeUnique, posIntegerToString } from "./Functions/ScanFunctions";

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

function Scan({ handleChangePage, type }) {
  // Different text for different types
  const [allowedStatusesText, setAllowedStatusesText] = useState("");
  const [endDialogText, setEndDialogText] = useState("");

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

  useEffect(() => {
    if (type === "Delete") {
      setAllowedStatusesText(
        "Allowed statuses are 'Added', 'Checked in', 'Checked out'."
      );
      setEndDialogText(
        "Are you sure you want to delete the scanned vials from CDD?"
      );
    } else if (type === "Check-in") {
      setAllowedStatusesText(
        "Only vials with status 'Checked out' can be checked-in."
      );
      setEndDialogText(
        "Are you sure you want to check-in the scanned vials to CDD?"
      );
    } else if (type === "Check-out") {
      setAllowedStatusesText("Allowed statuses are 'Added' and 'Checked in'.");
      setEndDialogText(
        "Are you sure you want to check-out the scanned vials from CDD?"
      );
    }
  }, []);

  // Load the projects from Database, only once
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

  // When project changed, delete all data
  const handleProjectChange = (event) => {
    setSelectecProject(projects[event.target.value]);
    setData([]);
    setOpenSnackbar(false);
  };

  // Data is changed (delete button clicked)
  const handleDataChanged = (newData) => {
    newData.forEach((item, index) => {
      newData[index].id = index + 1; // Renumber indeces
    });

    setData(newData);
  };

  // Barcode is scanned and added to list, (green plus button is clicked)
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
    fetchPosition(type, barcode, selectedProject)
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
                      ]["batch_fields"][0]["project"]["name"]
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
                  {allowedStatusesText}
                </React.Fragment>
              ),
            });
            setIsLoading(false);
            setOpenSnackbar(true);
            return;
          }

          const id = data.length + 1;
          const [, box, row, col] = response.data["backendRequest"]["response"][
            "output"
          ]["locationArray"];
          const project = selectedProject;
          const poslabel = posIntegerToString(row, col);
          const status =
            response.data["backendRequest"]["response"]["output"]["batchData"][
            "batch_fields"
            ]["Status"];
          const containerbarcode =
            response.data["backendRequest"]["response"]["output"]["batchData"][
            "batch_fields"
            ]["Container barcode"];
          const containertype =
            response.data["backendRequest"]["response"]["output"]["batchData"][
            "batch_fields"
            ]["Container type"];
          const fullname = Cookies.get("fullname");
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

          // Give success snackbar
          setDataSnackbar({
            type: "success",
            title: "Success",
            body: (
              <React.Fragment>
                <strong>{barcode}</strong>
                {" with status "} <strong>{status}</strong>
                {" found at  "}
                <strong>{project.name + "-" + box + "-" + poslabel}</strong>
              </React.Fragment>
            ),
          });
          setOpenSnackbar(true);
        }
        setIsLoading(false);
        return;
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

    fetchSendData(type, data)
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          console.log(
            response.data["backendRequest"]["response"]["message"]
          );
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
  const steps = ["Select project", "Scan barcodes"];

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
            isLoading={isLoading}
            selectedProject={selectedProject}
            onDataChange={handleDataChanged}
            onBarcodeSubmitted={handleBarcodeSubmitted}
          />
        );
      case 2:
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

    if (step !== 0 && step !== 2) {
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
    if (step === 1 && data.length > 0) {
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
    if (step === 0) {
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
    if (step === 2)
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

  return (
    <React.Fragment>
      <CssBaseline />
      <main className={classes.layout}>
        <Paper className={classes.paper}>
          <Typography component="h1" variant="h4" align="center">
            {type}
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
                  title: endDialogText,
                }}
                handleNo={handleDialog}
                handleYes={handleYesDialog}
              />
            </React.Fragment>
          </React.Fragment>
        </Paper>
      </main>
    </React.Fragment>
  );
}

export default Scan;
