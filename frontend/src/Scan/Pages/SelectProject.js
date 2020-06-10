import React from "react";
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

function SelectProject({ selectedProject, projects, onProjectChange, isLoading }) {
  const classes = useStyles();

  return (
    <div>
      <Typography variant="h5" gutterBottom className={classes.title}>
        Select project
      </Typography>
      <div className={classes.arrange}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <Select
          native
          variant="outlined"
          name="selectedproject"
          key="selectedproject_select"
          id="selectedproject_select"
          value={selectedProject.value}
          onChange={onProjectChange}
          className={classes.select}
        >
          {projects.map((item, index) => (
            <option value={item.value} key={"project_"+item.name}>{item.name}</option>
          ))}
        </Select>
        )
        }
      </div>
    </div>
  );
}

export default SelectProject;
