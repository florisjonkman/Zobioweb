import time
import datetime
import jwt
import json
import logging
import os
from flask import Flask, request, make_response
from flask_cors import CORS
from functools import wraps
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from base64 import b64decode

import ldap_connection
from api_cdd import ApiCDD
from box_functions_9x9 import *
from ldap_connection import ldap_connection, PRIVATE_KEY

"""
    Conventions:
        - all requests return a dictionary known as a 'response' with the (relavant) arguments:
            [status]        {int}       -- status code, see below for codes
            [statusText]    {string}    -- text beloging to status
            [data]          {dic}       -- dictionary in which keys:
                > [backendRequest]  {dic}   -- request made to this server
                        >> [request]    {dic}
                            * [type]        {string}    -- Type of request, 'GET', 'POST'
                            * [url]         {string}    -- URL of backend, with which the connection is made
                            * [headers]     {dic}       -- Headers of request
                            * [json]        {dic}       -- Body of request, (only with 'POST' request)
                        >> [response]   {dic}
                            * [message]     {string}    -- Response message
                            * [output]      {dic}       -- Reponse data, this contains the important data
                > [cddRequest]      {dic}   -- request made to CDD server, through api_cdd.py
                        >> [request]    {dic}
                        >> [response]   {dic}

    Status codes:
        status  --  statusText              -- Description
        200     --  OK                      -- The request was successfully completed.
        400     --  Bad request             -- The request was invalid.
        401     --  Unauthorized            -- The request did not include an authentication token or the authentication token was expired.
        500     --  Internal Server Error   -- The request was not completed due to an internal error on the server side.
"""

# Set logging
filename = 'server.py'
logger = logging.getLogger(filename)
logger.setLevel(level=logging.DEBUG)  # When debugging put to loggin.DEBUG
formatter = logging.Formatter("%(levelname)s | %(message)s")
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)

# Check if counter file exist, needed for print-file ID's
if(not os.path.isfile('counter.json')):
    print('> counter.json does not exist -> created')
    with open('counter.json', 'w') as counter_file:
        dic = {'counter': 0}
        counter_file.write(json.dumps(dic))

# Check if settings file exist, this file is mandatory
if(not os.path.isfile('settings.json')):
    print('> please create settings.json file with keys:')
    print('* ssl_directory - directory of public_key.pem, private_key.pem and requirements.txt')
    print('* print_directory - directory where print files must me stored')
    exit()

# Read settings file
with open('settings.json') as settings_file:
    settings = json.load(settings_file)
    ssl_dir = settings['ssl_directory']
    print_dir = settings['print_directory']
    if(not os.path.isdir(print_dir)):
        print('> print directory does not exist -> created')
        os.mkdir(print_dir)

# Check if requirements file exist, this file is mandatory
with open(ssl_dir + 'requirements.txt') as json_file:
    requirements = json.load(json_file)
    BASE_URL = "https://app.collaborativedrug.com/api/v1/vaults/%s/" % (
        requirements['cdd_vault_id'])
    TOKEN = requirements['cdd_token']
    SECRET_KEY = requirements['secret_key']

# Create CDD API Connection
ApiCdd = ApiCDD(BASE_URL, TOKEN)

# Create local API Connection for server
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
cors = CORS(app)
if __name__ == "__main__":
    app.run(debug=True, port=5000)
    # app.run(debug=True, port=5000, ssl_context=(
    #     './ssl/server.crt', './ssl/server.key'))


def make_response_object(status, message=None, request=None, output=None, cdd_request=None):
    data = {'backendRequest': {'request': request, 'response': {'message': message, 'output': output}},
            'cddRequest': cdd_request}

    response = make_response(data, status)
    return response


def token_required(f):
    """ Decorator that secures function by a token, only if the correct token is given the function can be called

    Args:
        f (function)

    """

    @ wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers['Token']

        if not token:
            logger.critical('%s | %s', filename, 'Token is missing')
            return make_response_object(401, 'Token is missing')

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'])
            logger.debug('%s | %s', filename, 'Token valid')
        except Exception as e:
            logger.error('%s | %s | %s', filename, 'Token invalid', e)
            return make_response_object(401, 'Token is invalid')

        return f(*args, **kwargs)

    return decorated


@ app.route('/projects', methods=['GET'])
@ token_required
def get_projects():
    """ Returns all projects in Vault

    Type: GET-request

    Returns:
        dic -- response, see make_response_object()
    """
    backend_request = {'type': 'GET', 'url': request.host_url +
                       'projects', 'headers': dict(request.headers)}

    cdd_request = ApiCdd.request_projects()

    status = cdd_request['response']['status']
    if(cdd_request['response']['status'] == 200):
        message = 'All requests successfully completed.'
        output = {'projects': cdd_request['response']['json']}
        return make_response_object(status=status, message=message, request=backend_request, output=output, cdd_request=None)
    else:
        message = 'CDD Error: please check cdd-request'
        return make_response_object(status=500, message=message, request=backend_request, output=None, cdd_request=cdd_request)


@ app.route('/batches', methods=['GET'])
@ token_required
def get_batches(id=None):
    """ Returns all batches in Vault

    Type: GET-request

    Returns:
        dic -- response, see make_response_object()
    """
    backend_request = {'type': 'GET', 'url': request.host_url +
                       'batches', 'headers': dict(request.headers)}

    if(id):
        cdd_request = ApiCdd.request_batches(
            page_size=999, projects=id)
    else:
        cdd_request = ApiCdd.request_batches(
            page_size=999)

    status = cdd_request['response']['status']
    if(cdd_request['response']['status'] == 200):

        # A check if bactches are not assigned to multiple projects.
        batches = cdd_request['response']['json']['objects']
        for batch in batches:
            if(len(batch['projects']) > 1):
                # batch is assigned to different projects, this cannot occcur by convention
                message = 'Error: batch {0} found in multiple projects ({1}), this cannot occur. Batch data: {2}'.format(batch['id'], batch['projects'],
                                                                                                                         batch)
                status = 500
                return make_response_object(status=status, message=message,
                                            request=backend_request, output=None, cdd_request=cdd_request)

        message = 'All requests successfully completed.'
        output = {'batches': batches}
        return make_response_object(status=status, message=message, request=backend_request, output=output, cdd_request=None)
    else:
        message = 'CDD Error: please check cdd-request'
        return make_response_object(status=500, message=message, request=backend_request, output=None, cdd_request=cdd_request)


@ app.route('/getlocation', methods=['POST'])
@ token_required
def get_location():
    """ Returns location and status of batch

    Type: POST-request

    Returns:
        dic -- response, see make_response_object()
    """
    # Get input from POST-request
    post_data = request.json

    backend_request = {'type': 'POST', 'url': request.host_url +
                       'getlocation', 'headers': dict(request.headers), 'json': post_data}

    try:
        # Try to get id and name of project
        request_project_id = post_data['project']['id']
        request_barcode = post_data['barcode']
    except Exception as e:
        # Else, return
        message = 'Bad request: [project][id] or [project][name] or [barcode] not in request data'
        logger.error('%s | %s | %s', filename, message, e)
        return make_response_object(
            status=400, message=message, request=backend_request)

    scan_type = post_data['type']
    if(scan_type == 'Add'):
        allowed_statusses = ['Registered']

    elif(scan_type == 'Check-in'):
        allowed_statusses = ['Checked out']

    elif(scan_type == 'Check-out'):
        allowed_statusses = ['Added', 'Checked in']

    elif(scan_type == 'Delete'):
        allowed_statusses = ['Added', 'Checked in',
                             'Checked out']
    else:
        message = 'Error: Bad request: scan type \'{0}\' is not valid'.format(
            scan_type)
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)

    # Get all batches in vault
    batch_request = get_batches()
    request_data = batch_request.json
    if(batch_request.status_code != 200):
        return make_response_object(status=batch_request.status_code, message=request_data['backendRequest']['response']['message'], request=backend_request, output=None, cdd_request=request_data['cddRequest'])

    batches = request_data['backendRequest']['response']['output']['batches']

    output = {'isInCDD': False, 'isInCorrectProject': False,
              'isCorrectStatus': False, 'batchData': None, 'locationArray': [None, None, None]}

    for batch in batches:
        # Loop over all batches in project
        print(batch)
        cdd_barcode = batch['batch_fields']['Vial barcode']
        cdd_project_id = batch['projects'][0]['id']
        cdd_status = batch['batch_fields']['Status']

        # Check 1
        if(request_barcode == cdd_barcode):
            output['batchData'] = batch

            # Barcode found in CDD
            output['isInCDD'] = True
            logger.debug('%s | %s', filename,
                         'barcode {0} found in CDD'.format(cdd_barcode))

            # Check 2
            if(request_project_id == cdd_project_id):
                # Batch project in CDD matches project of scanned barcode
                logger.debug('%s | %s', filename, 'barcode {0} found in correct project {1}'.format(
                    cdd_barcode, cdd_project_id))
                output['isInCorrectProject'] = True

            # Check 3
            if(cdd_status in allowed_statusses):
                # Status of batch in CDD is correct
                logger.debug(
                    '%s | %s', filename, 'barcode {0} status allowed'.format(cdd_barcode))
                output['isCorrectStatus'] = True
                if(scan_type != 'Add'):
                    output['locationArray'] = location_string_to_array(
                        batch['batch_fields']['Location'])

            break

    message = 'Success: Barcode found in CDD, in correct project and with correct status'
    if(not output['isInCDD']):
        message = 'Barcode not found in CDD'
    elif(not output['isInCorrectProject']):
        message = 'Barcode not found in CDD, but in different project'
    elif(not output['isCorrectStatus']):
        message = 'Barcode found in CDD, in correct project, but with incorrect status'

    return make_response_object(status=200, message=message, output=output, request=backend_request)


@ app.route('/getlastlocation', methods=['POST'])
@ token_required
def get_last_location():
    """ Returns the last location of project

    Type:
        POST-request

    Input from POST-request:
        dic -- {'name': [name of project],'id': [id of project]}

    Returns:
        dic -- response, see make_response_object()
    """

    # Get input from POST-request
    post_data = request.json

    backend_request = {'type': 'POST', 'url': request.host_url +
                       'getlastlocation', 'headers': dict(request.headers), 'json': post_data}

    try:
        # Try to get id and name of project
        request_project_id = post_data['project']['id']
        request_project_name = post_data['project']['name']
    except Exception as e:
        # Else, return
        message = 'Failed: [id] not in request data'
        logger.error('%s | %s | %s', filename, message, e)
        return make_response_object(
            status=400, message=message, request=backend_request)

    batch_request = get_batches(id=request_project_id)
    request_data = batch_request.json
    if(batch_request.status_code != 200):
        return make_response_object(status=batch_request.status_code, message=request_data['backendRequest']['response']['message'], request=backend_request, output=None, cdd_request=request_data['cddRequest'])

    batches = request_data['backendRequest']['response']['output']['batches']

    # Calculate last position
    last_box, last_row, last_col, last_batch = get_last_location_from_batches(
        batches, request_project_name)

    if(not last_batch):
        message = 'Success: but found that in this project no position has been occupied yet, so empty project. Thus start at first box, at first postion.'
        logger.debug('%s | %s', filename, message)
        response = make_response_object(200, message=message, output={
            'hasLastLocation': False, 'lastLocation': [], 'batch': None}, request=backend_request)
        return response

    message = 'Succesfully acquired last postion of project: {0} (id={1}), last postion: {0}-{2}-[{3},{4}], barcode: {5}'.format(
        request_project_name, request_project_id, last_box, last_row, last_col, last_batch.get('Vial barcode'))
    logger.debug('%s | %s', filename, message)
    response = make_response_object(200, message=message, output={
        'hasLastLocation': True, 'lastLocation': [
            request_project_name, last_box, last_row, last_col], 'batch': last_batch}, request=backend_request)

    return response


@ app.route('/submitdata', methods=['POST'])
@ token_required
def submit_data_to_CDD():
    """ Validates scanned barcodes (again) with CDD vault using the following 3 checks:
        1 - Check if barcodes exist in CDD Vault
        2 - Check if barcodes are scanned from the right project
        3 - Check if barcodes status is 'registered'

        And submits results to CDD Vault

    Type:
        POST-request

    Input from POST-request:
        list -- list of scanned items with keys:
            id, barcode, project, box, pos, timestamp, username,

    Returns:
        dic -- response, see make_response_object()
    """

    # Get input from POST-request
    post_data = request.json

    backend_request = {'type': 'POST', 'url': request.host_url +
                       'submitdata', 'headers': dict(request.headers), 'json': post_data}

    message = None
    if(not post_data):
        message = 'Error: no request body given'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)
    if(not post_data.get('data')):
        message = 'Error: request body does not have [data] key'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)
    if(len(post_data.get('data')) == 0):
        message = 'Error: request body [data]-object does not have any values'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)

    scan_type = post_data['type']
    to_status = None
    if(scan_type == 'Add'):
        to_status = 'Added'
        allowed_statusses = ['Registered']

    elif(scan_type == 'Check-in'):
        to_status = 'Checked in'
        allowed_statusses = ['Checked out']

    elif(scan_type == 'Check-out'):
        to_status = 'Checked out'
        allowed_statusses = ['Added', 'Checked in']

    elif(scan_type == 'Delete'):
        to_status = 'Deleted'
        allowed_statusses = ['Added', 'Checked in',
                             'Checked out']
    else:
        message = 'Error: Bad request: scan type \'{0}\' is not valid'.format(
            scan_type)
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)

    # Get all batches in vault
    batch_request = get_batches()
    request_data = batch_request.json
    if(batch_request.status_code != 200):
        return make_response_object(status=batch_request.status_code, message=request_data['backendRequest']['response']['message'], request=backend_request, output=None, cdd_request=request_data['cddRequest'])

    batches = request_data['backendRequest']['response']['output']['batches']

    # Creat output response
    output = {'success': None, 'failedVials': None, 'successVials': None}

    # Store when failed
    failed_vials = []
    success_vials = []
    all_succeeded = True

    for item in post_data['data']:
        # Loop over all scanned items
        scanned_barcode = item['barcode']
        scanned_project_id = item['project']['id']
        scanned_box = item['box']
        scanned_pos = item['poslabel']
        scanned_fullname = item['fullname']
        scanned_container_barcode = item['containerbarcode']
        scanned_container_type = item['containertype']

        cdd_barcode = None
        cdd_project_id = None
        cdd_status = None
        cdd_batch_id = None

        is_in_CDD = False
        is_in_correct_project = True
        is_correct_status = True

        for batch in batches:
            # Loop over all batches in project
            cdd_barcode = batch['batch_fields']['Vial barcode']
            cdd_project_name = batch['projects'][0]['name']
            cdd_project_id = batch['projects'][0]['id']
            cdd_status = batch['batch_fields']['Status']
            cdd_batch_id = batch['id']
            cdd_location = batch['batch_fields']['Location']

            item_data = {'scanData': item, 'postResponse': {'status': None, 'message': None, 'response': None}, 'inCDD': False,
                         'inCorrectProject': None, 'isCorrectStatus': None}

            # item_data = {'id': None, 'barcode': scanned_barcode, 'project': {
            #     'id': None, 'name': None}, 'status': None, 'location': None, 'postResponse': {'status': None, 'message': None, 'response': None}}

            if(scanned_barcode == cdd_barcode):
                # Check 1: Barcode found in CDD

                # print('Barcode found in CDD')
                item_data['inCDD'] = is_in_CDD = True
                logger.debug('%s | %s', filename,
                             'barcode {0} found in CDD'.format(cdd_barcode))

                # Check 2
                if(scanned_project_id != cdd_project_id):
                    # Batch project in CDD matches project of scanned barcode
                    item_data['inCorrectProject'] = is_in_correct_project = False
                    print(item_data['inCorrectProject'], is_in_correct_project)
                    logger.debug('%s | %s', filename, 'barcode {0} found in NOT the correct project {1}'.format(
                        cdd_barcode, cdd_project_name))
                else:
                    item_data['inCorrectProject'] = is_in_correct_project = True

                # Check 3
                if(cdd_status not in allowed_statusses):
                    # Status of batch in CDD is 'Registered'
                    item_data['isCorrectStatus'] = is_correct_status = False
                    logger.debug(
                        '%s | %s', filename, 'barcode {0} status NOT allowed'.format(cdd_barcode))
                else:
                    item_data['isCorrectStatus'] = is_correct_status = True

                break

        if(is_in_CDD and is_in_correct_project and is_correct_status):
            post_data_batch = {
                "batch_fields": {
                    "Status": to_status,
                    "Last touched by": scanned_fullname,
                    "Last touched on": datetime.datetime.strftime(datetime.datetime.now(), "%a %d %b %Y, %H:%M:%S")
                }
            }
            if scan_type == 'Add':
                post_data_batch['batch_fields']['Location'] = cdd_project_name + \
                    '-'+str(scanned_box)+'-'+scanned_pos
                post_data_batch['batch_fields']['Container barcode'] = scanned_container_barcode
                post_data_batch['batch_fields']['Container type'] = scanned_container_type

            cdd_put_request = ApiCdd.update_batch(
                cdd_batch_id, post_data_batch)
            item_data['postResponse']['status'] = cdd_put_request['response']['status']
            item_data['postResponse']['response'] = cdd_put_request['response']['json']

            if(cdd_put_request['response']['status'] == 200):
                item_data['postResponse']['message'] = 'Successfully submitted to CDD API'
                logger.info('%s | %s | %s | %s', filename, item_data['postResponse']['message'], 'barcode:{0} cdd_batch_id:{1} type:{2}'.format(
                    scanned_barcode, cdd_batch_id, scan_type), json.dumps(post_data_batch))
                success_vials.append(item_data)
            else:
                item_data['postResponse']['message'] = 'Failed to submit to CDD API'
                item_data['postResponse']['response'] = cdd_put_request
                logger.error('%s | %s | %s | %s', filename, item_data['postResponse']['message'], 'barcode: {0} cdd_batch_id:{1} type:{2}'.format(
                    scanned_barcode, cdd_batch_id, scan_type), json.dumps(post_data_batch))
                success_vials.append(item_data)
                all_succeeded = False
                failed_vials.append(item_data)
        else:
            item_data['postResponse']['status'] = 500
            item_data['postResponse']['message'] = "Did not pass all checks. InCDD: {0}, InCorrectProject, {1}, CorrectStatus: {2}".format(
                is_in_CDD, is_in_correct_project, is_correct_status)
            logger.critical('%s | %s', filename,
                            item_data['postResponse']['message'])
            item_data['postResponse']['response'] = None

            all_succeeded = False
            failed_vials.append(item_data)

    # Attach all checks to response
    output['success'] = all_succeeded
    output['failedVials'] = failed_vials
    output['successVials'] = success_vials

    message = 'Success: items submited, {0} fails'.format(
        len(failed_vials))
    logger.debug('%s | %s', filename, message)
    response = make_response_object(
        200, message=message, output=output, request=backend_request)

    return response


@ app.route('/printlabels', methods=['POST'])
@ token_required
def print_labels():

    # Get input from POST-request
    post_data = request.json

    backend_request = {'type': 'POST', 'url': request.host_url +
                       'printlabels', 'headers': dict(request.headers), 'json': post_data}

    message = None
    if(not post_data):
        message = 'Error: no request body given'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)
    if(not post_data.get('data')):
        message = 'Error: request body does not have [data] key'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)
    if(len(post_data.get('data')) == 0):
        message = 'Error: request body [data]-object does not have any values'
        logger.error('%s | %s', filename, message)
        return make_response_object(
            status=400, message=message, request=backend_request)

    try:
        counter_file = open('counter.json', 'r+')
        counter_dic = json.load(counter_file)
        counter = counter_dic['counter'] = counter_dic['counter'] + 1
        counter_file.seek(0)  # Goes to first line
        counter_file.truncate(0)  # Erases everything
        counter_file.write(json.dumps(counter_dic))
        counter_file.close()

        date_string = datetime.datetime.strftime(
            datetime.datetime.now(), "%Y-%m-%d_%H_%M_%S")
        text_file = open(print_dir + date_string +
                         "_Labels_" + str(counter) + '.txt', 'w')
        text_file.write('Barcode, Project, Box, Position')

        for item in post_data['data']:
            # Loop over all scanned items
            barcode = item['barcode']
            project = item['project']['name']
            box = item['box']
            position = item['poslabel']
            text_file.write('\n{0}, {1}, {2}, {3}'.format(
                barcode, project, box, position))

        text_file.close()
    except Exception as e:
        return make_response_object(400, message='Failed to upload print-file, Error: {0}'.format(str(e)), request=backend_request)

    return make_response_object(
        200, message='Successfully upload print-file to print directory', request=backend_request)


@ app.route('/login', methods=['POST'])
def login():
    """ Route for login in, 'headers' of request must contain username and (encrypted) password

    Returns:
        dic -- response, see make_response_object()
    """
    # POST Authorization input {username, password [ENCRYPTED]}
    headers = request.headers

    post_data = request.json
    backend_request = {'type': 'POST', 'url': request.host_url +
                       'login', 'headers': dict(headers), 'json': post_data}

    # Load private key as serialization object
    private_key = serialization.load_pem_private_key(
        PRIVATE_KEY,
        password=None,
        backend=default_backend()
    )

    # Decrypt passsword in bytes
    decrypt_pass_bytes = private_key.decrypt(
        b64decode(headers['password']),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # Convert to string
    decrypt_pass = decrypt_pass_bytes.decode('utf-8')

    # Connect with LDAP
    ldap_response = ldap_connection(headers['username'], decrypt_pass)

    if(ldap_response['status']):
        token = jwt.encode(
            {'user': ldap_response['userData']['username'], 'exp': datetime.datetime.utcnow()+datetime.timedelta(hours=24)}, app.config['SECRET_KEY'])
        return make_response_object(status=200, message=ldap_response['message'], output={'token': token.decode('UTF-8'), 'userData': ldap_response['userData']}, request=backend_request)
    else:
        return make_response_object(status=401, message=ldap_response['message'], request=backend_request)


@ app.route('/')
def home():
    return """
    <html>
        <head>
            <title>Zobioweb Backend</title>
        </head>
        <body>
            <h1>API connections</h1>
            <a href="https://192.168.60.12:8080/login" target="_blank">/login</a> Login connection to LDAP | POST | header = {username, password} <br>
            <a href="https://192.168.60.12:8080/projects" target="_blank">/projects</a> Get projects of vault | GET | Token required | header = {Token} <br>
            <a href="https://192.168.60.12:8080/batchbarcodes" target="_blank">/batchbarcodes</a> Get batch barcodes of vault | GET | Token required | header = {Token} <br>
            <a href="https://192.168.60.12:8080/getlocation" target="_blank">/getlocation</a> Get location barcode | POST | Token required | header = {Token} | data = {type, project, barcode} <br>
            <a href="https://192.168.60.12:8080/getlastlocation" target="_blank">/getlastlocation</a> Get last occupied location of project | POST | Token required | header = {Token} | data = {selectedProject} <br>
            <a href="https://192.168.60.12:8080/submitdata" target="_blank">/projects</a> Submit data to CDD Vault | POST | Token required | header = {Token} | data = {type,data} <br>
        </body>
    </html>
"""
