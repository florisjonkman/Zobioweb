import React, { useState } from "react";

import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";

import Button from "@material-ui/core/Button";

function MyDialog({ open, data, handleDialog, handleYesDialog }) {
  return (
    <Dialog
      open={open}
      onClose={handleDialog}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{data.title}</DialogTitle>
      {data.body && (
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {data.body}
          </DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={handleYesDialog} color="primary">
          Yes
        </Button>
        <Button onClick={handleDialog} color="primary" autoFocus>
          No
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MyDialog;
