import React, { useState } from "react";

import {
  makeStyles,
  createMuiTheme,
  ThemeProvider,
} from "@material-ui/core/styles";
import MaterialTable from "material-table";

import TextField from "@material-ui/core/TextField";
import AddIcon from "@material-ui/icons/Add";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Chip from "@material-ui/core/Chip";
import Paper from "@material-ui/core/Paper";

import LinearProgress from "@material-ui/core/LinearProgress";

const useStyles = makeStyles((theme) => ({
  inputLabel: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  circular: {
    color: theme.palette.success.main,
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  chip: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  button: {
    // backgroundColor: theme.palette.success.main,
    // color: "#FFFF",
    // "&:hover": {
    //   backgroundColor: theme.palette.success.dark,
    //   color: "#FFFFF",
    // },
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  buttons: {
    marginTop: theme.spacing(5),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const themeTable = createMuiTheme({
  overrides: {
    MuiTableRow: {
      root: {
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
      },
    },
  },
});

function ScanItems({
  data,
  selectedProject,
  onDataChange,
  onBarcodeSubmitted,
  isLoading,
}) {
  const classes = useStyles();
  const [barcode, setBarcode] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();
    if (barcode !== "") {
      onBarcodeSubmitted(barcode);
      setBarcode("");
    }
  };

  const onChange = (event) => {
    setBarcode(event.target.value);
  };

  const onEnterPressed = (event) => {
    if (event.key === "Enter") {
      if (!isLoading) {
        onSubmit(event);
      } else {
        setBarcode("");
      }
    }
  };

  return (
    <div>
      <ThemeProvider theme={themeTable}>
        <MaterialTable
          components={{
            Container: (props) => <Paper {...props} elevation={0} />,
          }}
          title="Scanned vials"
          options={{
            paging: false,
            search: false,
            showTitle: true,
            toolbar: true,
          }}
          columns={[
            { title: "No", field: "id", editable: "never" },
            { title: "Vial barcode", field: "barcode", editable: "never" },
            {
              title: "Project",
              field: "project",
              editable: "never",
              render: (rowData) => rowData["project"]["name"],
            },
            { title: "Box", field: "box", editable: "never" },
            { title: "Position", field: "poslabel", editable: "never" },
            { title: "Status", field: "status", editable: "never" },
            { title: "Container barcode", field: "containerbarcode", editable: "never" }
          ]}
          localization={{
            header: {
              actions: "",
            },
          }}
          data={data}
          editable={{
            onRowDelete: (oldData) =>
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  {
                    let dataCopy = Array.from(data);
                    const index = dataCopy.indexOf(oldData);
                    dataCopy.splice(index, 1);
                    onDataChange(dataCopy);
                  }
                  resolve();
                }, 10);
              }),
          }}
        />
      </ThemeProvider>
      {isLoading && <LinearProgress />}
      <div className={classes.buttons}>
        <Chip
          disabled={true}
          className={classes.chip}
          label={selectedProject.name}
        />
        <TextField
          variant="outlined"
          value={barcode}
          name="barcode"
          key="scanitems_barcode"
          id="scanitems_barcode"
          label="Barcode"
          className={classes.inputLabel}
          onChange={onChange}
          onKeyPress={onEnterPressed}
          autoFocus
        />

        <Button
          name="barcode"
          variant="contained"
          aria-label="add"
          color="primary"
          className={classes.button}
          onClick={onSubmit}
          disabled={isLoading}
        >
          {isLoading && <CircularProgress size={35} />}
          {!isLoading && <AddIcon fontSize="large" />}
        </Button>
      </div>
    </div>
  );
}

export default ScanItems;
