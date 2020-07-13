import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import Tooltip from "@material-ui/core/Tooltip";
import CircularProgress from "@material-ui/core/CircularProgress";

import { posIntegerToString } from "../Functions/ScanFunctions";

const useStyles = makeStyles((theme) => ({
  title: {
    display: "flex",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  subtitle: {
    display: "flex",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
  },
  inputLabel: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  buttons: {
    display: "flex",
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
    // justifyContent: "space-around",
  },
  select: {
    width: 200,
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  arrange: {
    display: "flex",
    justifyContent: "center",
  },
}));

function SelectContainer({
  selectedProject,
  selectedContainer,
  firstLocation,
  firstLocationBatchData,
  containers,
  onContainerChange,
  isLoading,
  handleNext,
}) {
  const classes = useStyles();

  const [contentStep, setContentStep] = useState(0);

  function getStepContent(step) {
    let contents = [];

    if (step === 0 && selectedContainer) {
      const [lastBox, lastRow, lastCol] = firstLocation;
      const locationString = posIntegerToString(lastRow, lastCol);
      if (lastBox !== 0) {
        contents.push(
          <Tooltip
            key={'selectcontainer-tooltip'}
            title={`Last occupied position: ${selectedProject.name}-${lastBox}-${locationString}, Container barcode: ${firstLocationBatchData["Container barcode"]}, Container type: ${firstLocationBatchData["Container type"]}`}
            arrow
          >
            <Button
              key="button_continuebox"
              name="button_continuebox"
              variant="contained"
              color="primary"
              onClick={handleNext}
              className={classes.buttons}
            >
              Continue with previous box
            </Button>
          </Tooltip>
        );
      }
      contents.push(
        <Button
          variant="contained"
          name="button_newbox"
          key="button_newbox"
          color="primary"
          onClick={() => {
            setContentStep(1);
          }}
          className={classes.buttons}
        >
          Fill new box
        </Button>
      );
    }
    if (step === 1 || !selectedContainer) {
      contents.push(
        <ButtonGroup
          orientation="vertical"
          color="primary"
          aria-label="vertical contained primary button group"
          variant="contained"
        >
          {containers.map((item, index) => (
            <Button
              children={item.name}
              key={`selectedContainer-container-${index}`}
              aria-label={`vertical contained primary button ${index}`}
              onClick={() => {
                onContainerChange(item);
              }}
            ></Button>
          ))}
        </ButtonGroup>
      );
    }

    return contents;
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom className={classes.title}>
        Select container
      </Typography>
      {contentStep === 1 && (
        <Typography variant="subtitle1" className={classes.subtitle}>
          Fill new box
        </Typography>
      )}
      <div className={classes.arrange}>
        {isLoading ? <CircularProgress /> : getStepContent(contentStep)}
      </div>
    </div>
  );
}

export default SelectContainer;
