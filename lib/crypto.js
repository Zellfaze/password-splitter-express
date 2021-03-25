var  secrets = require('secrets.js-grempe');
var scrypt = require('scrypt-js');
var aes = require('js-crypto-aes');

// Setup AES params
const N = 1024;
const blockSize = 8;
const parallelCost = 1;
const dkLen = 32;

var CryptoFunctions = {
  generateBlob: generateBlob,
  decryptBlob: decryptBlob,
  validateBlob: validateBlob,
  extractMetadataFromBlob: extractMetadataFromBlob,
  generateShares: generateShares,
  recombineShares: recombineShares,
  encryptShare: encryptShare,
  decryptShare: decryptShare,
  hashPassword: hashPassword
}

module.exports = CryptoFunctions;


// Returns a Promise for a JSON blob ready to be saved
function generateBlob(plaintext, groupSize, requiredMembers, credentials) {
  // Generate our shares
  let shares = generateShares(plaintext, groupSize, requiredMembers);
  
  // Combine our shares array with our credentials array
  let combinedArray = [];
  for (let i = 0; i < groupSize; i++) {
    combinedArray.push({
      id: shares[i].id,
      credentials: credentials[i],
      share: shares[i]
    })
  }
  
  // Encrypt our shares
  let combinedPromises = combinedArray.map( (currentShare) => {
    return encryptShare(currentShare.share, currentShare.credentials.password).then( (encryptedShare) => {
      return {
        id: currentShare.id,
        credentials: currentShare.credentials,
        share: currentShare.share,
        encryptedShare: encryptedShare
      };
    });
  });
  
  
  // Shuffle some data around and strip stuff we don't need anymore
  return Promise.all(combinedPromises).then( (combinedEncrypted) => {
    let newStuff = combinedEncrypted.map( (currentShare) => {
      return {
        id: currentShare.id,
        username: currentShare.credentials.username,
        encryptedShare: currentShare.encryptedShare
      }
    });
    
    return JSON.stringify({
      groupSize: groupSize,
      requiredMembers: requiredMembers,
      data: newStuff
    });
  });
}

// Returns a Promise for a decrypted plaintext
function decryptBlob(blob, credentials) {
  // Parse the blob into an object
  let parsedBlob;
  try {
    parsedBlob = JSON.parse(blob);
  } catch (err) {
    return Promise.reject("Unable to parse blob! Corrupted?");
  }
  
  // Make sure there are enough credentials here
  if (credentials.length < parsedBlob.requiredMembers) {
    return Promise.reject(`Not enough credentials, need at least: ${parsedBlob.requiredMembers}`);
  }
  
  // Filter our shares based on which credentials we have
  // It also nicely lines up the arrays
  let filteredShares = [];
  for (let i = 0; i < credentials.length; i++) {
    let currentUsername = credentials[i].username;
    parsedBlob.data.forEach( (currentShare) => {
      if (currentShare.username === currentUsername) {
        filteredShares.push(currentShare);
      }
    });
  }
  
  if (filteredShares.length < parsedBlob.requiredMembers) {
    return Promise.reject(`Not enough valid credentials, need at least: ${parsedBlob.requiredMembers}`);
  }
  
  // Decrypt our shares
  let decryptionPromises = [];
  for (let i = 0; i < credentials.length; i++) {
    decryptionPromises.push(decryptShare(filteredShares[i].encryptedShare, credentials[i].password));
  }
  
  return Promise.all(decryptionPromises).then( (results) => {
    return recombineShares(results);
  });
}

function validateBlob(blob) {
  // Parse the blob into an object
  let parsedBlob;
  try {
    parsedBlob = JSON.parse(blob);
  } catch (err) {
    return false;
  }
  
  //Make sure it has requiredMembers and it's at least 2
  if (!((parsedBlob.hasOwnProperty("requiredMembers")) && (parsedBlob.requiredMembers >= 2))) {
    return false;
  }
  
  //Make sure it has groupSize and it's at least as big as requiredMembers
  if (!((parsedBlob.hasOwnProperty("groupSize")) && (parsedBlob.groupSize >= parsedBlob.requiredMembers))) {
    return false;
  }
  
  //Make sure it has a data property, that it is an array, and that it has as many elements as groupSize
  if (!((parsedBlob.hasOwnProperty("data")) && (Array.isArray(parsedBlob.data)) && (parsedBlob.data.length === parsedBlob.groupSize))) {
    return false;
  }
  
  //Check each encrypted share
  //TODO: Swap this forEach with a reduce
  let allGood = true;
  let foundUsers = [];
  parsedBlob.data.forEach( (currentShare) => {
    // Make sure that there is an ID property
    if (!currentShare.hasOwnProperty('id')) {
      allGood = false;
      return;
    }
    
    // Make sure that there is a username property
    if (!currentShare.hasOwnProperty('username')) {
      allGood = false;
      return;
    }
    
    //Check if we have seen this username already
    if (foundUsers.findIndex( (element) => {return element === currentShare.username}) !== -1) {
      allGood = false;
      return;
    }
    
    //We haven't seen this username already, add it to the list
    foundUsers.push(currentShare.username);
    
    // Make sure there is an encryptedShare property
    if (!currentShare.hasOwnProperty('encryptedShare')) {
      allGood = false;
      return;
    }
    
    // Make sure there is an encryptedShare.id property
    if (!currentShare.encryptedShare.hasOwnProperty('id')) {
      allGood = false;
      return;
    }
    
    // Make sure there is an encryptedShare.bits property and it's set to 8
    if (!((currentShare.encryptedShare.hasOwnProperty('bits')) && (currentShare.encryptedShare.bits === 8))) {
      allGood = false;
      return;
    }
    
    // Make sure there is an encryptedShare.encryptedShare property
    if (!currentShare.encryptedShare.hasOwnProperty('encryptedShare')) {
      allGood = false;
      return;
    }
    
    // Make sure there is an encryptedShare.salt property
    if (!currentShare.encryptedShare.hasOwnProperty('salt')) {
      allGood = false;
      return;
    }
    
    // Make sure there is an encryptedShare.iv property
    if (!currentShare.encryptedShare.hasOwnProperty('iv')) {
      allGood = false;
      return;
    }
    
    // Make sure that ID matches between id and encryptedShare.id
    if (currentShare.id !== currentShare.encryptedShare.id) {
      allGood = false;
      return;
    }
    
    //TODO: Validate the following:
    //  encryptedShare, salt, and iv should all be hex strings
  });
  
  // Part of the above validation failed
  if (allGood === false) {
    return false;
  }
  
  
  // All the checks passed!
  return true;
}

// Returns a Promise for a metadata object about the blob
function extractMetadataFromBlob(blob) {
  // Parse the blob into an object
  let parsedBlob;
  try {
    parsedBlob = JSON.parse(blob);
  } catch (err) {
    return Promise.reject("Unable to parse blob! Corrupted?");
  }
  
  const users = parsedBlob.data.map( (currentShare) => {
    return currentShare.username;
  });
  
  return Promise.resolve({
    groupSize: parsedBlob.groupSize,
    requiredMembers: parsedBlob.requiredMembers,
    users: users
  });
}

// Returns an array of shares
// {id, bits, data, share} (all hex strings)
function generateShares(text, groupSize, requiredMembers) {
  if ((groupSize >= 2) && (groupSize <= 255) &&
    (requiredMembers >= 2) && (requiredMembers <= 255) &&
    (text.length > 0))
  {
    // Convert the plaintext to a string of hex bytes
    let hexText = secrets.str2hex(text);
  
    // Generate Shamir's shares
    let shares = secrets.share(hexText, Number(groupSize), Number(requiredMembers));
    shares = shares.map( (share) => {
      // Extract the share data
      let shareData = secrets.extractShareComponents(share);
      shareData.share = share;
      return shareData;
    });
    
    return shares;
  }
  
  // These parameters are invalid, just return false
  return false;
}

// Returns the plaintext that was used to create the shares
function recombineShares(shares) {
  const sharesText = shares.map( (current) => {
    return current.share;
  });
  
  return secrets.hex2str(secrets.combine(sharesText));
}

// Returns a Promise to encrypt a share with a password
// {id, bits, encryptedShare, salt, iv} (all hex strings)
function encryptShare(share, password) {
  let passwordHashPromise = hashPassword(password);
  
  return passwordHashPromise.then( (hashObj) => {
    return aesEncrypt(share.share, hashObj.hash).then( (cryptObj) => {
      return {
        id: share.id,
        bits: share.bits,
        encryptedShare: cryptObj.data,
        salt: hashObj.salt,
        iv: cryptObj.iv
      };
    }).catch( (err) => {
      return Promise.reject("Failed to encrypt share!");
    });
  }).catch( (err) => {
    return Promise.reject("Failed to hash password!");
  });
}

// Returns a Promise to decrypt an encrypted share with a password
// {id, bits, data, share} (all hex strings)
function decryptShare(encryptedShare, password) {
  let passwordHashPromise = hashPassword(password, encryptedShare.salt, true);
  
  return passwordHashPromise.then( (hashObj) => {
    return aesDecrypt(encryptedShare.encryptedShare, hashObj.hash, encryptedShare.iv).then( (plaintext) => {
      // Let's do some rudimentary checks that the share decrypted
      const shareComponents = secrets.extractShareComponents(plaintext);
      if (!((shareComponents.id === encryptedShare.id) &&
          (shareComponents.bits === encryptedShare.bits)))
      {
        return Promise.reject("Share verification failed! Corrupted share?");
      }
      
      return {
        id: shareComponents.id,
        bits: shareComponents.bits,
        data: shareComponents.data,
        share: plaintext
      };
    }).catch( (err) => {
      return Promise.reject("Failed to decrypt share! Bad password?");
    });
  }).catch( (err) => {
    return Promise.reject("Failed to hash password!");
  });
}


// ===================
// Private Methods
// ===================

// Returns encrypted data
// {data, iv} (all hex strings)
function aesEncrypt(data, hash) {
  const iv = generateIV();
  const dataArray = hexStringtoUint8Array(data);
  const hashArray = hexStringtoUint8Array(hash);
  
  return aes.encrypt(dataArray, hashArray, {name: 'AES-GCM', iv: iv, tagLength: 16}).then( (ciphertext) => {
    return {
      data: uint8ArraytoHexString(ciphertext),
      iv: uint8ArraytoHexString(iv)
    };
  });
}

// Returns decrypted data as a hex string
function aesDecrypt(ciphertext, hash, iv) {
  const ivArray = hexStringtoUint8Array(iv);
  const hashArray = hexStringtoUint8Array(hash);
  const ciphertextArray = hexStringtoUint8Array(ciphertext);
  
  return aes.decrypt(ciphertextArray, hashArray, {name: 'AES-GCM', iv: ivArray, tagLength: 16}).then( (plaintext) => {
    return uint8ArraytoHexString(plaintext);
  });
}


// Returns a Promise to hash a password with a given salt
// {hash, salt}
function hashPassword(password, salt = null, saltHex = false) {
  let passwordArray = normalStringtoUint8Array(password);
  let saltArray;
  if (salt === null) {
    saltArray = generateSalt();
    salt = uint8ArraytoHexString(saltArray);
  } else {
    if (saltHex) {
      saltArray = hexStringtoUint8Array(salt);
    } else {
      saltArray = normalStringtoUint8Array(salt);
    }
  }
  
  return scrypt.scrypt(passwordArray, saltArray, N, blockSize, parallelCost, dkLen).then( (hashArray) => {
    let hash = uint8ArraytoHexString(hashArray);
    return {
      hash: hash,
      salt: salt
    };
  });
}


// ===================
// Generators
// ===================

// Returns a random 12 Byte array to use as an IV
function generateIV() {
  return hexStringtoUint8Array(secrets.random(96));
}

// Returns a random 12 Byte array to use as a salt
function generateSalt() {
  return hexStringtoUint8Array(secrets.random(96));
}

// ===================
// String<->Byte Helpers
// ===================

// Normalizes a string then converts it to an array of bytes
function normalStringtoUint8Array(string) {
  return hexStringtoUint8Array(secrets.str2hex(string.normalize('NFKC')));
}

// Converts a hex string into an array of bytes
function hexStringtoUint8Array(string) {
  return new Uint8Array(string.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Converts an array of bytes to a hex string
// Last byte is done seperately so that it does not have a leading zero.
// This is required to keep with the format produced by secrets.js-grempe
function uint8ArraytoHexString(array) {
  const lastElement = array.slice(-1);
  const otherElements = array.slice(0, -1);
  const string = otherElements.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  return string + Number(lastElement).toString(16);
}
