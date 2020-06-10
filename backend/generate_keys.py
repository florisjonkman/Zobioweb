from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256, SHA
from base64 import b64decode
# import pem

# """ Encryption """

# 1024 means the keysize will be 1024 bits
key_pair = RSA.generate(1024)
private_key = open("./ssl/private_key.pem", "w")
private_key.write(key_pair.exportKey().decode("utf-8"))
private_key.close()

public_key = open("./ssl/public_key.pem", "w")
public_key.write(key_pair.publickey().exportKey().decode("utf-8"))
public_key.close()

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
