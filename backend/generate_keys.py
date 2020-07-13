from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from os import path, mkdir
from base64 import b64decode, b64encode


def generate_keys(dir=""):
    if(dir and dir[-1] != '/'):
        dir = dir + "/"

    if(dir):
        if(path.exists(dir)):
            print('> Keys will be stored in \'{0}\''.format(dir))
        else:
            print('> Given directory does not exist -> directory will be created')
            mkdir(dir)
    else:
        dir = "./"
        print('> Keys will be stored in same directory.')

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    with open(dir + 'private_key.pem', 'wb') as f:
        f.write(private_pem)
    print('> Private key stored as {0}private_key.pem'.format(dir))

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    with open(dir + 'public_key.pem', 'wb') as f:
        f.write(public_pem)

    with open(dir + 'public_key.json', 'w') as f:
        # repr() makes from newlines and \n, and replace is because json file accept " instead of '
        public_key_string = repr(public_pem.decode()).replace('\'', "\"")
        f.write("{\"public_key\": %s}" % public_key_string)

    print('> Public key stored as {0}public_key.pem'.format(dir))
    print()


def test_keys(dir=""):
    with open(dir + "private_key.pem", "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )

    with open(dir + "public_key.pem", "rb") as key_file:
        public_key = serialization.load_pem_public_key(
            key_file.read(),
            backend=default_backend()
        )

    message = b'This is the secret message'
    print('> Message: ')
    print("{0}\n(type: {1})\n".format(message, type(message)))

    encrypted = public_key.encrypt(
        message,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    print('> Public key: ')
    print("{0}\n(type: {1})\n".format(public_key, type(public_key)))

    print('> Encrypted message in bytes: ')
    print("{0}\n(type: {1})\n".format(encrypted, type(encrypted)))

    print('> String send over internet: ')
    sendString = b64encode(encrypted)
    print("{0}\n(type: {1}, len: {2})\n".format(
        sendString, type(sendString), len(sendString)))

    print('> Encrypted message in decoded to bytes: ')
    sendString_bytes = b64decode(sendString)
    print("{0}\n(type: {1})\n".format(
        sendString_bytes, type(sendString_bytes)))

    original_message = private_key.decrypt(
        sendString_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    print('> Private key: ')
    print("{0}\n(type: {1})\n".format(private_key, type(private_key)))
    print('> Decrypted message: ')
    print("{0}\n(type: {1})\n".format(
        original_message, type(original_message)))


generate_keys('./ssl/')
test_keys('./ssl/')
