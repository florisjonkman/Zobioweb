// Check if barcode is unique in dataset
export function isBarcodeUnique(data, barcode) {
  let isUnique = true;
  data.forEach((item, index) => {
    if (barcode === item.barcode) {
      isUnique = false;
      return isUnique;
    }
  });
  return isUnique;
}

// Format dateTime-object to string
export function formatDate(dateTime) {
  // Settings for HH:MM, DD MMM YYYY
  const monthNames = [
    "Jan",
    "Feb",
    "Mrt",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];

  //  Setting for HH:MM, DD MMM YYYY
  let month = monthNames[dateTime.getMonth()];
  let day = "" + dateTime.getDate();
  let year = "" + dateTime.getFullYear();
  let hours = "" + dateTime.getHours();
  let min = "" + dateTime.getMinutes();

  // month = month.length > 1 ? month : "0" + month;
  day = day.length > 1 ? day : "0" + day;
  hours = hours.length > 1 ? hours : "0" + hours;
  min = min.length > 1 ? min : "0" + min;

  return "" + hours + ":" + min + ", " + day + " " + month + " " + year;
}

/**
 * Returns next box and position
 *
 * @param {integer} box   box [1,inf]
 * @param {integer} pos   position [11,12...18,19,21,22...,28,29,31,32......98,99]
 */
export function nextLocation(box, pos) {
  let nextBox = 1;
  let nextPos = 11;

  if (!box && !pos) {
    // No correct values given, start with beginning
    return [nextBox, nextPos];
  }

  if (pos >= 99) {
    // Last position, go to next box
    nextBox = box + 1;
    nextPos = 11;
  } else if (pos % 10 === 9) {
    // At the end of a row, go to next row (+2), same box
    nextBox = box;
    nextPos = pos + 2;
  } else {
    // Same box, next position
    nextBox = box;
    nextPos = pos + 1;
  }

  return [nextBox, nextPos];
}

/**
 * Returns previous box and position
 *
 * @param {integer} box   box [1,inf]
 * @param {integer} pos   position [11,12...18,19,21,22...,28,29,31,32......98,99]
 */
export function previousLocation(box, pos) {
  let prevBox = 1;
  let prevPos = 11;

  // No correct values given, start with beginning
  if ((!box && !pos) || (box === 1 && pos === 11)) {
    return [prevBox, prevPos];
  }

  if (pos <= 11) {
    // First position, go to previous box
    prevBox = box - 1;
    prevPos = 99;
  } else if (pos % 10 === 1) {
    // At the beginning of a row, go to prev row (-2), same box
    prevBox = box;
    prevPos = pos - 2;
  } else {
    // Same box, previous position
    prevBox = box;
    prevPos = pos - 1;
  }

  return [prevBox, prevPos];
}

/**
 * Maps position in string format [A1,A2,A3,...,I7,I8,I9] format to integer [11,12,13,...,97,98,99] format
 *
 * @param {string} string   position [A1,A2...A8,A9,B1,B2...,B8,B9,C1,C2......I8,I9]
 */
export function posStringToInteger(string) {
  const row = string.substring(0, 1);
  const col = parseInt(string.substring(1, 2));

  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const rowIndex = (letters.indexOf(row) + 1) * 10;
  const colIndex = col;

  const result = rowIndex + colIndex;

  return result;
}

/**
 * Maps position in integer [11,12,13,...,97,98,99] format to string format [A1,A2,A3,...,I7,I8,I9]
 *
 * @param {integer} pos   position [11,12...18,19,21,22...,28,29,31,32......98,99]
 */
export function posIntegerToString(pos) {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const rowLetter = letters[Math.floor(pos / 10) - 1];
  const colIndex = pos % 10;

  const result = rowLetter + colIndex.toString();

  return result;
}

export function sendMail(body) {
  var link =
    "mailto:fjonkman@zobio.com?" +
    "subject=" +
    escape("Scanned items failed") +
    "&body=" +
    escape(body);

  window.open(link, "_blank");
}
