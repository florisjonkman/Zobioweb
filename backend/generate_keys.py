from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256, SHA
from base64 import b64decode
# import pem

# """ Encryption """
# CRYPTO PACKAGE

# 1024 means the keysize will be 1024 bits
# key_pair = RSA.generate(1024)
# private_key = open("./ssl/private_key.pem", "w")
# private_key.write(key_pair.exportKey().decode("utf-8"))
# private_key.close()

# public_key = open("./ssl/public_key.pem", "w")
# public_key.write(key_pair.publickey().exportKey().decode("utf-8"))
# public_key.close()

# message = 'secret message'
# print('Message: ')
# print("{0}\n(type: {1})\n".format(message, type(message)))

# public_key_string = open("./ssl/public_key.pem").read()
# public_key = RSA.importKey(public_key_string)
# cipher = PKCS1_OAEP.new(public_key)
# ciphertext = cipher.encrypt(message.encode())
# print('Public key: ')
# print("{0}\n".format(public_key_string))
# print('Encrypted message: ')
# print("{0}\n(type: {1})\n".format(ciphertext, type(ciphertext)))

# private_key_string = open("./ssl/private_key.pem").read()
# private_key = RSA.importKey(private_key_string)
# cipher = PKCS1_OAEP.new(private_key)
# decryptmessage = cipher.decrypt(ciphertext).decode()
# print('Private key: ')
# print("{0}\n".format(private_key_string))
# print('Decrypted message: ')
# print("{0}\n(type: {1})\n".format(decryptmessage, type(decryptmessage)))

# """ Encryption """
# cryptography PACKAGE
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding


# private_key = rsa.generate_private_key(
#     public_exponent=65537,
#     key_size=2048,
#     backend=default_backend()
# )
# public_key = private_key.public_key()

# pem = private_key.private_bytes(
#     encoding=serialization.Encoding.PEM,
#     format=serialization.PrivateFormat.PKCS8,
#     encryption_algorithm=serialization.NoEncryption()
# )

# with open('private_key.pem', 'wb') as f:
#     f.write(pem)

# pem = public_key.public_bytes(
#     encoding=serialization.Encoding.PEM,
#     format=serialization.PublicFormat.SubjectPublicKeyInfo
# )

# with open('public_key.pem', 'wb') as f:
#     f.write(pem)

with open("./ssl/private_key.pem", "rb") as key_file:
    private_key = serialization.load_pem_private_key(
        key_file.read(),
        password=None,
        backend=default_backend()
    )

with open("./ssl/public_key.pem", "rb") as key_file:
    public_key = serialization.load_pem_public_key(
        key_file.read(),
        backend=default_backend()
    )

message = b'secret message'
print('Message: ')
print("{0}\n(type: {1})\n".format(message, type(message)))

encrypted = public_key.encrypt(
    message,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

print('Public key: ')
print("{0}\n(type: {1})\n".format(public_key, type(public_key)))
print('Encrypted message: ')
print("{0}\n(type: {1})\n".format(encrypted, type(encrypted)))

print('Encrypted message: ')
print("{0}\n(type:)\n".format(encrypted.decode()))

original_message = private_key.decrypt(
    encrypted,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

print('Private key: ')
print("{0}\n(type: {1})\n".format(private_key, type(private_key)))
print('Decrypted message: ')
print("{0}\n(type: {1})\n".format(original_message, type(original_message)))
