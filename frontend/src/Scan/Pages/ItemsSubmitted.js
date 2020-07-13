import React from "react";
import MaterialTable from "material-table";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import CircularProgress from "@material-ui/core/CircularProgress";

const useStyles = makeStyles((theme) => ({
  title: {
    display: "flex",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  select: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  line: {
    // height: 40,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
  },
  block: {
    width: 1000,
    display: "flex",
  },
}));

const TableBarcodes = (props) => {
  return (
    <MaterialTable
      components={{
        Container: (props) => <Paper {...props} elevation={0} />,
      }}
      style={{
        whiteSpace: "normal",
        wordWrap: "break-word"
      }}
      title="Response from CDD"
      options={{
        paging: false,
        search: false,
        showTitle: true,
        toolbar: true,
        exportButton: false,
        exportFileName: "FailedSubmittedBarcodes",
        rowStyle: { height: 10 },
      }}
      columns={[
        {
          title: "Vial barcode", field: "barcode", editable: "never",
          render: (rowData) => rowData["scanData"]['barcode'],
        },
        {
          title: "CDD Response",
          field: "message",
          editable: "never",
          render: (rowData) => rowData["postResponse"]["message"],
        },
        {
          title: "CDD Response",
          field: "cddResponse",
          editable: "never",
          render: (rowData) =>
            JSON.stringify(rowData["postResponse"]["response"]),
        },
      ]}
      data={props.data}
    />
  );
};

function ItemsSubmitted({
  isLoading,
  allItemsSubmitted,
  failedSubmittedItems,
}) {
  const classes = useStyles();

  return (
    <div className={classes.line}>
      {isLoading ? (
        <CircularProgress />
      ) : allItemsSubmitted ? (
        <Typography variant="h5" gutterBottom className={classes.title}>
          Data changes successfully submitted to CDD.
        </Typography>
      ) : (
            <div>
              <div className={classes.line}>
                <Typography variant="subtitle1" color="error">
                  Not all data changes successfully submitted to CDD.
            </Typography>
              </div>
              <br />
              <TableBarcodes
                data={failedSubmittedItems}
                className={classes.block}
              />
              <br />
              <div className={classes.line}>
                <Typography variant="subtitle1">Please report to Stijn</Typography>
              </div>
            </div>
          )}
    </div>
  );
}

export default ItemsSubmitted;
