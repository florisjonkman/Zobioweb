import React, { useState } from "react";

import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import Snackbar from "@material-ui/core/Snackbar";


function MySnackbar({ open, data, handleSnackbar }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={handleSnackbar}
    >
      <Alert severity={data.type} onClose={handleSnackbar}>
        <AlertTitle>{data.title}</AlertTitle>
        {data.body}
      </Alert>
    </Snackbar>
  );
}

export default MySnackbar;
