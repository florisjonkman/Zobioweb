import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import LinearProgress from "@material-ui/core/LinearProgress";

const useStyles = makeStyles((theme) => ({
  title: {
    display: "flex",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
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
  loadingBar: {
    display: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    width: 200,
  },
}));

function PrintLabels({ isLoading, isPrintFileSend }) {
  const classes = useStyles();

  console.log(isPrintFileSend);

  function getContent() {
    if (isPrintFileSend) {
      return (
        <Typography variant="subtitle1">Print data sent to printer</Typography>
      );
    } else {
      return (
        <Typography variant="subtitle1">
          Press the print labels button, when finshed 'submit' the items to CDD
        </Typography>
      );
    }

    if (isPrintFileSend) {
      if (isLoading) {
        return (
          <Typography variant="subtitle1">
            Print data sent to printer, but still loading...
          </Typography>
        );
      } else {
        return (
          <Typography variant="subtitle1">
            Print data sent to printer
          </Typography>
        );
      }
    } else {
      if (isLoading) {
        return <Typography variant="subtitle1">Loading...</Typography>;
      } else {
        return (
          <Typography variant="subtitle1">
            Press the print labels button, when finshed 'submit' the items to
            CDD
          </Typography>
        );
      }
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom className={classes.title}>
        Print Labels
      </Typography>
      <div className={classes.arrange}>
        {isPrintFileSend &&
          (isLoading ? (
            <Typography variant="subtitle1">
              Data sent to printer, but still loading...
            </Typography>
          ) : (
            <Typography variant="subtitle1">Data sent to printer</Typography>
          ))}
        {!isPrintFileSend &&
          (isLoading ? (
            <Typography variant="subtitle1">
              Sending data to printer...
            </Typography>
          ) : (
            <Typography variant="subtitle1">
              Print the labels, when finshed 'submit' the items to CDD
            </Typography>
          ))}
        <br />
      </div>
    </div>
  );
}

export default PrintLabels;
