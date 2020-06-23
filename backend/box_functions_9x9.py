import logging

# Set logging
filename = 'box_functions_9x9.py'
logger = logging.getLogger(filename)
logger.setLevel(level=logging.INFO)  # When debugging put to loggin.DEBUG
formatter = logging.Formatter("%(levelname)s | %(message)s")
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)


def location_string_to_array(location):
    """ Turns FJM1-1-A1 string into array [FJM,1,11]
        Location convention: '<project name>'-'<box>'-'<pos>'

    Args:
        location (string): String seperated by two '-'

    Returns:
        list
    """
    project_name = ""
    pos_int = 0
    box_int = 0

    try:
        # Location convention: '<project name>'-'<box>'-'<pos>'
        project_name, box_str, pos_str = location.split('-')
        pos_int = map_pos_string_to_interger(pos_str)
        box_int = int(box_str)
    except Exception as e:
        logger.error('%s | \'%s\' cannot be splitted  | %s',
                     filename, location, e)

    return [project_name, box_int, pos_int]


def get_last_location_from_batches(batches, request_project_name):
    """ Checks and returns what the last location
        NOTE: Currently based on 9x9 boxes, rows: A,B,...,I; colums: 1,2,...,9;

    Arguments:
        batches {list} -- list with all batches in project
        request_project_name {string} -- name of project

    Returns:
        int, int -- box [1,inf], pos [11,12...18,19,21,22...,28,29,31,32......98,99]
    """

    # Last location starts at 0,0
    last_box = 0
    last_pos = 0

    for batch in batches:
        # Loop over all batches
        if((not batch['Status']) or batch['Status'] == 'Registered'):
            continue

        # Only batches if status is 'Registered'

        name, box_int, pos_int = location_string_to_array(batch['Location'])

        # if(name != request_project_name):
        #     # This can NEVER occur, to be sure output when it happens
        #     message = 'Strange: LocationPrefix is not the same as request_project_name, cdd_project_name = {0}, request_project_name = {1}!'.format(
        #         name, request_project_name)
        #     logger.warning('%s | %s', filename, message)

        # Calculate last location
        last_box, last_pos = latest_location(
            box_int, pos_int, last_box, last_pos)

    return last_box, last_pos


def map_pos_string_to_interger(pos):
    """ Maps string location (e.g. A2, I9) to int (e.g. 12, 99)
        NOTE: Currently based on 9x9 boxes, rows: A,B,...,I; colums: 1,2,...,9;

    Arguments:
        pos {string} -- string of position A1,A2,...A9,B1,...

    Returns:
        int -- int of position 11,12,...19,21,...
    """
    row = pos[0]
    col = pos[1]

    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    row_index = (letters.index(row)+1)*10
    col_index = int(col)

    result = row_index + col_index

    return result


def map_pos_inter_to_string(integer):
    """ Maps string location (e.g. 12, 99) to int (e.g. A2, I9)
        NOTE: Currently based on 9x9 boxes, rows: A,B,...,I; colums: 1,2,...,9;

    Arguments:
        pos {int} -- string of position 11,12,...19,21,...

    Returns:
        int -- int of position A1,A2,...A9,B1,...
    """

    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    row_letter = letters[int(integer/10.)-1]
    col_index = integer % 10

    result = row_letter + str(col_index)

    return result


def latest_location(box, pos, last_box, last_pos):
    """ Compares two locations and returns which position is latest
        NOTE: Currently based on 9x9 boxes, rows: A,B,...,I; colums: 1,2,...,9;

    Arguments:
        box {int} -- new box location
        pos {int} -- new pos location
        last_box {int} -- latest box location
        last_pos {int} -- latest pos location

    Returns:
        last_box ,last_pos {int,int}
    """

    # print('get_latest_location(%d,%d,%d,%d)' %
    #       (box, pos, last_box, last_pos))
    if(box < last_box):
        # box is below, last_box, do no change anything
        return last_box, last_pos
    elif(box == last_box):
        # box number the same
        if(pos > last_pos):
            # pos is later than last_pos, change last_pos
            last_pos = pos
    else:
        # box is larger than last_box, change last_box
        last_box = box

        # new box, so last_pos is starting position
        last_pos = 11

        if(pos > last_pos):
            # pos is later than last_pos, change last_pos
            last_pos = pos

    # print('> return %d %d' % (last_box, last_pos))
    return last_box, last_pos
