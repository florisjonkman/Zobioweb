import React, { useState } from "react";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import Avatar from "@material-ui/core/Avatar";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardHeader from "@material-ui/core/CardHeader";
import Link from "@material-ui/core/Link";

import GetAppIcon from "@material-ui/icons/GetApp";
import PublishIcon from "@material-ui/icons/Publish";
import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import CheckInIcon from "../img/FridgeIn2.svg";
import CheckOutIcon from "../img/FridgeOut2.svg";

const useStyles = makeStyles((theme) => ({
  buttons: {
    margin: 10,
  },
  avatarAdd: {
    backgroundColor: theme.palette.success.main,
  },
  avatarCheck: {
    backgroundColor: theme.palette.warning.main,
  },
  avatarDelete: {
    backgroundColor: theme.palette.error.main,
  },
}));

function HomeScreen({ handleChangePage }) {
  const classes = useStyles();

  return (
    <React.Fragment>
      <Card className={classes.buttons}>
        <CardActionArea>
          <Link
            onClick={() => {
              handleChangePage("Add");
            }}
            underline="none"
            color="textPrimary"
          >
            <CardHeader
              avatar={
                <Avatar aria-label="recipe" className={classes.avatarAdd}>
                  <AddIcon fontSize='large' />
                </Avatar>
              }
              title="Add"
              subheader="Scan new vials and add them to a project"
            />
          </Link>
        </CardActionArea>
      </Card>
      <Card className={classes.buttons}>
        <CardActionArea>
          <Link
            onClick={() => {
              handleChangePage("Check-out");
            }}
            underline="none"
            color="textPrimary"
          >
            <CardHeader
              avatar={
                <Avatar aria-label="recipe" className={classes.avatarCheck}>
                  <img src={CheckOutIcon} width={22} />
                </Avatar>
              }
              title="Check-out"
              subheader="Scan vials and use them in the lab"
            />
          </Link>
        </CardActionArea>
      </Card>
      <Card className={classes.buttons}>
        <CardActionArea>
          <Link
            onClick={() => {
              handleChangePage("Check-in");
            }}
            underline="none"
            color="textPrimary"
          >
            <CardHeader
              avatar={
                <Avatar aria-label="recipe" className={classes.avatarCheck}>
                  <img src={CheckInIcon} width={22} />
                </Avatar>
              }
              title="Check-in"
              subheader="Scan vials and place them back into the fridge"
            />
          </Link>
        </CardActionArea>
      </Card>
      <Card className={classes.buttons}>
        <CardActionArea>
          <Link
            onClick={() => {
              handleChangePage("Delete");
            }}
            underline="none"
            color="textPrimary"
          >
            <CardHeader
              avatar={
                <Avatar aria-label="recipe" className={classes.avatarDelete}>
                  <CloseIcon fontSize='large' />
                </Avatar>
              }
              title="Delete"
              subheader="Scan vials and delete them from the project"
            />
          </Link>
        </CardActionArea>
      </Card>
    </React.Fragment>
  );
}

export default HomeScreen;
