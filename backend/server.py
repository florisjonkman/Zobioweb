import time
import datetime
import jwt
import ldap_connection
import json
from flask import Flask, request, make_response
from flask_cors import CORS
from functools import wraps
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256
from base64 import b64decode

from api_cdd import ApiCDD
from box_functions_9x9 import *
from ldap_connection import ldap_connection, PUBLIC_KEY, PRIVATE_KEY

"""
    Conventions:
        - all requests return a dictionary known as a 'response' with the (relavant) arguments:
            [status]        {int}       -- status code, see below for codes
            [statusText]    {string}    -- text beloging to status
            [data]          {dic}       -- dictionary in which keys:
                > [message] {string}    -- message
                > [request] {string}    -- result of response of CDD API class
                > [output]  {dic}       -- output of response, important data is stored here
                > [postData]{dic}       -- data send with request

    Status codes:
        status  --  statusText              -- Description
        200     --  OK                      -- The request was successfully completed.
        400     --  Bad request             -- The request was invalid.
        401     --  Unauthorized            -- The request did not include an authentication token or the authentication token was expired.
        500     --  Internal Server Error   -- The request was not completed due to an internal error on the server side.
"""

# Load CDD Vault, token and secret key
with open('./ssl/requirements.txt') as json_file:
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


def make_response_object(status, message=None, request=None, output=None, post_data=None):
    data = {'message': message, 'request': request,
            'output': output, 'postData': post_data}

    response = make_response(data, status)
    return response

# Decorator to secure routess


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('authorization')

        if not token:
            return make_response_object(401, 'Token is missing')

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'])
        except:
            return make_response_object(401, 'Token is invalid')

        return f(*args, **kwargs)
        # Set all API Routes

    return decorated


@app.route('/projects', methods=['GET'])
@token_required
def get_projects():
    """ Returns all projects in Vault

    Type: GET-request

    Returns:
        dic -- response, see make_response_object()
    """

    cdd_request = ApiCdd.get_projects()

    return make_response_object(status=cdd_request['status'], message=cdd_request['message'], request=cdd_request['request'], output=cdd_request['cddResponse'])


@app.route('/vialbarcodes', methods=['GET'])
@token_required
def get_vials():
    """ Returns all vial barcodes in Vault

    Type: GET-request

    Returns:
        dic -- response, see make_response_object()
    """
    cdd_request = ApiCdd.get_vials()

    return make_response_object(status=cdd_request['status'], message=cdd_request['message'], request=cdd_request['request'], output=cdd_request['cddResponse'])


@app.route('/getlocation', methods=['POST'])
@token_required
def get_location():
    """ Returns location and status of vial

    Type: POST-request

    Returns:
        dic -- response, see make_response_object()
    """

    # Get input from POST-request
    post_data = request.json

    print('\npost_data')
    print(post_data)

    try:
        # Try to get id and name of project
        request_project_id = post_data['project']['id']
        request_project_name = post_data['project']['name']
        request_barcode = post_data['barcode']
    except:
        # Else, return
        message = 'Failed: [project][id] or [project][name] or [barcode] not in post data'
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

    scan_type = post_data['type']

    if(scan_type == 'Add'):
        allowed_statusses = ['Registered']

    elif(scan_type == 'Check-in'):
        allowed_statusses = ['Checked out']

    elif(scan_type == 'Check-out'):
        allowed_statusses = ['Added', 'Checked in']

    elif(scan_type == 'Delete'):
        allowed_statusses = ['Added', 'Checked in',
                             'Checked out', 'Registered']
    else:
        message = 'Failed: scan type \'{0}\' is not valid'.format(scan_type)
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

    # Get all vials in vault
    # print('\nApiCdd.get_vials()')
    cdd_response = ApiCdd.get_vials()
    # print(cdd_response)

    if(cdd_response['status'] != 200):
        # If request failed at CDD API Class, return
        message = 'Error: cdd_response[\'status\']  failed'
        response = make_response_object(
            status=500, message=message, request=cdd_response, post_data=post_data)
        return response

    vials = cdd_response['cddResponse']['vials']

    output = {'isInCDD': False, 'isInCorrectProject': False,
              'isCorrectStatus': False, 'vialData': None, 'locationArray': [None, None, None]}

    for vial in vials:
        # Loop over all vials in project
        cdd_barcode = vial['Vial barcode']
        cdd_project_id = vial['project']['id']
        cdd_status = vial['Status']

        output['vialData'] = vial

        # Check 1
        if(request_barcode == cdd_barcode):
            # Barcode found in CDD
            output['isInCDD'] = True

            # Check 2
            if(request_project_id == cdd_project_id):
                # Vial project in CDD matches project of scanned barcode
                output['isInCorrectProject'] = True

            # Check 3
            if(cdd_status in allowed_statusses):
                # Status of vial in CDD is correct
                output['isCorrectStatus'] = True
                if(scan_type != 'Add'):
                    output['locationArray'] = location_string_to_array(
                        vial['Location'])

            break

    # if(scan_type == 'Add'):
    #     request_last_location = get_last_location()
    #     if(request_last_location.status_code != 200):
    #         # Request failed, return
    #         message = 'Error: could not find last location'
    #         response = make_response_object(
    #             status=500, message=message, post_data=post_data)
    #         return response

    #     output['locationArray'] = request_last_location.json[
    #         'output']['last location']

    return make_response_object(status=200, message='Success', output=output, post_data=post_data)


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
    print('\npost_data')
    print(post_data)

    try:
        # Try to get id and name of project
        request_project_id = post_data['id']
        request_project_name = post_data['name']
    except:
        # Else, return
        message = 'Failed: \'id\' not in post data'
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

    # Get batches in project
    cdd_response = ApiCdd.get_batches(id=request_project_id)

    if(cdd_response['status'] != 200):
        # Request failed, return
        message = 'Error: cdd_response[\'status\'] failed'
        response = make_response_object(
            status=500, message=message, request=cdd_response, post_data=post_data)
        return response

    # Get batches
    batches = cdd_response['cddResponse']['batches']

    # Calculate last position
    last_box, last_pos = get_last_location_from_batches(
        batches, request_project_name)

    message = 'Succesfully acquired last postion of project: {0} (id={1}), last postion: {0}-{2}-{3}'.format(
        request_project_name, request_project_id, last_box, last_pos)
    response = make_response_object(200, message=message, output={
        'last location': [
            request_project_name, last_box, last_pos]}, post_data=post_data)

    return response


@ app.route('/validatebarcodes', methods=['POST'])
@ token_required
def validate_barcodes():
    """ Validates scanned barcodes with CDD vault using the following 3 checks:
        1 - Check if barcodes exist in CDD Vault
        2 - Check if barcodes are scanned from the right project
        3 - Check if barcodes status is 'registered'

    Type:
        POST-request

    Input from POST-request:
        list -- list of scanned items with keys:
            id, barcode, project, box, pos, timestamp, username,

    Returns:
        dic -- response, see make_response_object()
    """

    # Get response with all vials from CDD Vault
    cdd_response = ApiCdd.get_vials()

    # Get input data from client (Web Browser)
    post_data = request.json

    if((not post_data) or (len(post_data) == 0)):
        # If no barcodes were found in data, return
        message = 'Failed: Number of scanned items in post data is 0'
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

    if(cdd_response['status'] != 200):
        # If request failed at CDD API Class, return
        message = 'Error: cdd_response[\'status\']  failed'
        response = make_response_object(
            status=500, message=message, request=cdd_response, post_data=post_data)
        return response

    # Creat output response
    output = {'check1': {'result': False, 'failedBarcodes': []},
              'check2': {'result': False, 'failedBarcodes': []},
              'check3': {'result': False, 'failedBarcodes': []}}

    # Get all vials with (barcode, status and location) from CDD Vault
    vials = cdd_response['cddResponse']['vials']

    # Check 1
    barcodes_not_in_cdd = []
    barcodes_in_cdd = True

    # Check 2
    barcodes_not_in_project = []
    barcodes_in_project = True

    # Check 3
    barcodes_not_registred = []
    barcodes_registered = True

    for item in post_data:
        # Loop over all scanned items
        scanned_barcode = item['barcode']
        scanned_project = item['project']

        cdd_barcode = None
        cdd_project = None
        cdd_status = None

        is_in_CDD = False
        is_in_correct_project = True
        is_registered = True

        for vial in vials:
            # Loop over all vials in project
            cdd_barcode = vial['Vial barcode']
            cdd_project = vial['project']['name']
            cdd_status = vial['Status']
            cdd_location = vial['Location']

            # Check 1
            if(scanned_barcode == cdd_barcode):
                # Barcode found in CDD
                is_in_CDD = True

                # Check 2
                if(scanned_project != cdd_project):
                    # Vial project in CDD matches project of scanned barcode
                    is_in_correct_project = False

                # Check 3
                if(cdd_status != 'Registered'):
                    # Status of vial in CDD is 'Registered'
                    is_registered = False

                break

        if(not is_in_CDD):
            # If a scanned barcode has NOT been found in CDD, check1 = False, append unfound scanned barcode
            barcodes_in_cdd = False
            barcodes_not_in_cdd.append(
                {'barcode': scanned_barcode, 'project': None, 'status': None, 'location': None})

        if(not is_in_correct_project):
            # If a scanned barcode has NOT been found in correct CDD project, check2 = False
            # > append mismatched scanned barcode + project found in CDD + status in CDD
            barcodes_in_project = False
            barcodes_not_in_project.append(
                {'barcode': scanned_barcode, 'project': cdd_project, 'status': cdd_status, 'location': cdd_location})

        if(not is_registered):
            # If a scanned barcode status is not 'Registered', check3 = False
            # > append mismatched scanned barcode + project found in CDD + status in CDD
            barcodes_registered = False
            barcodes_not_registred.append(
                {'barcode': scanned_barcode, 'project': cdd_project, 'status': cdd_status, 'location': cdd_location})

    # Attach all checks to response
    output['check1'] = {'result': barcodes_in_cdd,
                        'failedBarcodes': barcodes_not_in_cdd}
    output['check2'] = {'result': barcodes_in_project,
                        'failedBarcodes': barcodes_not_in_project}
    output['check3'] = {'result': barcodes_registered,
                        'failedBarcodes': barcodes_not_registred}

    message = 'Success: all checks done'
    response = make_response_object(
        200, message=message, output=output, post_data=post_data)

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

    # Get response with all vials from CDD Vault
    cdd_response = ApiCdd.get_vials()

    # Get input data from client (Web Browser)
    post_data = request.json

    if((not post_data) or (len(post_data['data']) == 0)):
        # If no barcodes were found in data, return
        message = 'Failed: Number of scanned items in post data is 0'
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

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
                             'Checked out', 'Registered']
    else:
        message = 'Failed: scan type \'{0}\' is not valid'.format(scan_type)
        response = make_response_object(
            status=400, message=message, post_data=post_data)
        return response

    if(cdd_response['status'] != 200):
        # If request failed at CDD API Class, return
        message = 'Error: cdd_response[\'status\']  failed'
        response = make_response_object(
            status=500, message=message, request=cdd_response, post_data=post_data)
        return response

    # Creat output response
    output = {'success': None, 'failedVials': None, 'successVials': None}

    # Get all vials with (barcode, status and location) from CDD Vault
    vials = cdd_response['cddResponse']['vials']

    # Store when failed
    failed_vials = []
    success_vials = []
    all_succeeded = True

    for item in post_data['data']:
        # Loop over all scanned items
        scanned_barcode = item['barcode']
        scanned_project_id = item['project']['id']
        scanned_project_name = item['project']['name']
        scanned_box = item['box']
        scanned_pos = item['poslabel']
        # scanned_username = item['username']
        scanned_fullname = item['fullname']

        cdd_barcode = None
        cdd_project = None
        cdd_project_id = None
        cdd_status = None
        cdd_batch_id = None
        cdd_location = None

        is_in_CDD = False
        is_in_correct_project = True
        is_correct_status = True

        for vial in vials:
            # Loop over all vials in project
            cdd_barcode = vial['Vial barcode']
            cdd_project_name = vial['project']['name']
            cdd_project_id = vial['project']['id']
            cdd_status = vial['Status']
            cdd_batch_id = vial['id']
            cdd_location = vial['Location']

            # Check 1
            if(scanned_barcode == cdd_barcode):
                # Barcode found in CDD
                print('Barcode found in CDD')
                is_in_CDD = True

                # Check 2
                if(scanned_project_id != cdd_project_id):
                    # Vial project in CDD matches project of scanned barcode
                    print('\'{0}\' ({1}),\'{2}\' ({3})'.format(
                        scanned_project_name, scanned_project_id, cdd_project_name, cdd_project_id))
                    print('Barcode found wrong project')
                    is_in_correct_project = False

                # Check 3
                if(cdd_status not in allowed_statusses):
                    print(cdd_status, allowed_statusses)
                    print('Barcode has incorrect status')
                    # Status of vial in CDD is 'Registered'
                    is_correct_status = False

                item_data = {'id': cdd_batch_id, 'barcode': scanned_barcode, 'project': {
                    'id': cdd_project_id, 'name': cdd_project}, 'status': cdd_status, 'location': cdd_location, 'post response': {'status': None, 'message': None, 'response': None}}

                break

        if(is_in_CDD and is_in_correct_project and is_correct_status):
            post_data_batch = {
                "batch_fields": {
                    "Status": to_status,
                    "Last touched by": scanned_fullname,
                    "Last touched on": datetime.datetime.strftime(datetime.datetime.now(), "%H:%M:%S, %d %b %Y")
                }
            }
            if scan_type == 'Add':
                post_data_batch['batch_fields']['Location'] = cdd_project_name + \
                    '-'+str(scanned_box)+'-'+scanned_pos

            cdd_put_response = ApiCdd.update_batch(
                cdd_batch_id, post_data_batch)
            if(cdd_put_response['status'] == 200):
                item_data['post response']['status'] = 200
                item_data['post response']['message'] = 'Successfully submitted to CDD API'

                success_vials.append(item_data)
            else:
                item_data['post response']['status'] = cdd_put_response['status']
                item_data['post response']['message'] = 'Failed to submit to CDD API'
                item_data['post response']['response'] = cdd_put_response

                all_succeeded = False
                failed_vials.append(item_data)
        else:
            item_data['post response']['status'] = 500
            item_data['post response']['message'] = "Did not pass all checks, the second time"
            item_data['post response']['response'] = None
            print(item_data['post response']['message'])

            all_succeeded = False
            failed_vials.append(item_data)

    # Attach all checks to response
    output['success'] = all_succeeded
    output['failedVials'] = failed_vials
    output['successVials'] = success_vials

    message = 'Success: items submited, {0} fails'.format(
        len(failed_vials))
    response = make_response_object(
        200, message=message, output=output, post_data=post_data)

    return response


@ app.route('/login', methods=['POST'])
def login():
    """ Route for login in, 'authorization' of request must contain username and password

    Returns:
        dic -- response, see make_response_object()
    """
    # POST Authorization input {username, password [ENCRYPTED]}
    auth = request.authorization

    # Decrypt password
    private_key = RSA.importKey(PRIVATE_KEY)
    cipher = PKCS1_OAEP.new(private_key, hashAlgo=SHA256)
    decrypt_pass = cipher.decrypt(b64decode(auth.password))

    # Connect with LDAP
    ldap_response = ldap_connection(auth.username, decrypt_pass)

    # print('Encrypted password: ')
    # print("{0}\n(type: {1})".format(auth.password, type(auth.password)))
    # print('Private key: ')
    # print("{0}\n(type: {1})".format(
    #     PRIVATE_KEY, type(PRIVATE_KEY)))
    # print('Decrypted message: ')
    # print("{0}\n(type: {1})\n".format(decrypt_pass, type(decrypt_pass)))

    if(ldap_response['status']):
        token = jwt.encode(
            {'user': ldap_response['userData']['username'], 'exp': datetime.datetime.utcnow()+datetime.timedelta(hours=24)}, app.config['SECRET_KEY'])
        return make_response_object(status=200, message=ldap_response['message'], output={'token': token.decode('UTF-8'), 'userData': ldap_response['userData']})
    else:
        return make_response_object(status=401, message=ldap_response['message'])


# private_key = RSA.importKey(PRIVATE_KEY)
# cipher = PKCS1_OAEP.new(private_key)
# decryptmessage = cipher.decrypt(ciphertext).decode()
# print('Private key: ')
# print("{0}\n".format(private_key_string))
# print('Decrypted message: ')
# print("{0}\n(type: {1})\n".format(decryptmessage, type(decryptmessage)))
