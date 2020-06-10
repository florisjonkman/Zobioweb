import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
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
    width: 200,
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  arrange: {
    display: "flex",
    justifyContent: "center",
  },
}));

function PrintLabels() {
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <Typography variant="h5" gutterBottom className={classes.title}>
        Print Labels
      </Typography>
      <div className={classes.arrange}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <div>
            <Typography variant="subtitle1">
              Press the print labels button and follow the instructions, when
              finshed 'submit' the items to CDD
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintLabels;
