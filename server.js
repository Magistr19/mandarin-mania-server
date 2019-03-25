'use strict';

let http = require('http');
let server = new http.Server();
let fs = require('fs');

global.easyRecords = require('./server/database/records/records-easy.json');
global.mediumRecords = require('./server/database/records/records-medium.json');
global.hardRecords = require('./server/database/records/records-hard.json');
global.users = require('./server/database/users/users.json');

let reqRecords = null;

const PORT = 8087;
let serverUrl = `localhost:${PORT}`

server.on('request', (req, res) => {
	res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, X-CSRF-Token',
		'Access-Control-Allow-Methods': 'PUT, POST, GET, DELETE, OPTIONS',
		'Content-type': 'application/x-www-form-urlencoded'
  });

	try { // ( ͡° ͜ʖ ͡°)
    switch (req.method) {
      case 'GET': {
        let objParam = getParam(req.url);

        if (objParam.difficult) {
          let topScore = getTopScore(objParam.difficult, objParam.nickName);
					res.end(createRespStringify(true, topScore));
        }
        break;
      }

      case 'POST': {
        let objParam = getParam(req.url);

        if (objParam.nickName && !objParam.userId) {
          let userName = objParam.nickName;
          let isValidUser = checkIsValid(userName);

          if (!isValidUser) {
            res.end(createRespStringify(false, null, 'Not valid nickname'));
            break;
          }

          let isNewUser = checkIsNew(userName);

          if (!isNewUser) {
            res.end(createRespStringify(false, null, 'User already exist'));
            break;
          }

          let userId = createUserId();

          createNewUser(userId, userName);

          res.end(createRespStringify(true, userId));

          break;
        } else if (objParam.nickName && objParam.userId && objParam.score && objParam.difficult && objParam.date) {
          let userNickName = objParam.nickName;
          let userId = objParam.userId;
          let score = objParam.score;
          let difficult = objParam.difficult;
          let date = objParam.date;

          let isUserExist = checkIsUserExist(userNickName, userId);

          if (!isUserExist) {
            res.end(createRespStringify(false, null, 'User not exist'));
            break;
          }

          let isImprovedScore = checkIsImprovedScore(userNickName, score, difficult);

          if (!isImprovedScore) {
            res.end(createRespStringify(true, 'Score not better'));
            break;
          }

          createScore(userNickName, score, difficult, date);
          res.end(createRespStringify(true, 'Result is updated'));
          break;
        }
        break;
      }
    }

    } catch(err) {
		res.end(createRespStringify(false, null, '' + err));
  }
});


server.listen(PORT);
console.log(`Server is working on port: ${PORT}`);


function createRespStringify(isSuccess, data, errorText) {
	let responseObj = {};
	responseObj.isSuccess = isSuccess;

	(isSuccess) ? responseObj.data = data : responseObj.errorText = errorText;

	let stringifyObj = JSON.stringify(responseObj);
	return stringifyObj;
}

function getParam(url) {
	let obj = {};
	let startIndex = url.indexOf('?') + 1;
	let str = url.slice(startIndex);

	while (str !== '') { //Пока строку всю не разобрали
		if (str.indexOf('&') !== -1) {
			let equalIndex = str.indexOf('=');
			let ampIndex = str.indexOf('&');

			let objKey = str.slice(0, equalIndex);
			let objProp = str.slice(equalIndex + 1, ampIndex);

			obj[objKey] = objProp;
			str = str.slice(ampIndex + 1);
		} else { // Если уже нету амперсанта (след. ключ-значения)
			let equalIndex = str.indexOf('=');

			let objKey = str.slice(0, equalIndex);
			let objProp = str.slice(equalIndex + 1);
			obj[objKey] = objProp;
			str = '';
		}
	}

	return obj;
}

function getTopScore(difficult, nickName) {
  let score = global[`${difficult}Records`];
  let newScore = score.slice(0, 10);

  if (nickName != null) {
    for (let i = 0; i < newScore.length; i++) {
      if (newScore[i].nickName === nickName) {
        return newScore;
      }
    }

    for (let i = 0; i < score.length; i++) {
      if (score[i].nickName === nickName) {
        let userScore = score[i];
        userScore.rank = i + 1;
        newScore.splice(-1, 1, userScore);
        return newScore;
      }
    }
    return newScore;
  } else {
    return newScore;
  }
}

function checkIsValid(nick) { //?! Доделать
  if (nick.length < 4 || nick.length > 12) {
    return false;
  }

  return true;
}

function checkIsNew(nick) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].nickName === nick) {
      return false;
    }
  }

  return true;
}

function createUserId() {
  let date = new Date();
  date = date.getTime();

  return date;
}

function createNewUser(id, nick) {
  let newUser = {};
  newUser.userId = '' + id;
  newUser.nickName = nick;

  users.push(newUser);

  fs.writeFile('./server/database/users/users.json', JSON.stringify(users), err => console.log(err));
}

function checkIsUserExist(nick, id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].userId === id && users[i].nickName === nick) {
      return true;
    }
  }
  return false;
}

function checkIsImprovedScore(nick, score, difficult) {
  let scoreList = global[`${difficult}Records`];

  for (let i = 0; i < scoreList.length; i++) {
    if (scoreList[i].nickName === nick) {
      if (scoreList[i].score >= score) {
        return false;
      } else {
        return true;
      }
    }
  }
  return true;
}

function createScore(nick, score, difficult, date) {
  let scoreList = global[`${difficult}Records`];

  let newScore = {};
  newScore.nickName = nick;
  newScore.score = score;
  newScore.date = date;

  for (let i = 0; i < scoreList.length; i++) {
    if (scoreList[i].nickName === nick) {
      scoreList.splice(i, 1);
    }
  }

  if (scoreList.length === 0) {
    scoreList.push(newScore);
    fs.writeFile(`./server/database/records/records-${difficult}.json`, JSON.stringify(scoreList), err => console.log(err));
    return;
  }

  if (scoreList[0].score < newScore.score) {
    scoreList.unshift(newScore);
    fs.writeFile(`./server/database/records/records-${difficult}.json`, JSON.stringify(scoreList), err => console.log(err));
    return;
  }

  if (scoreList[scoreList.length - 1].score >= newScore.score) {
    scoreList.push(newScore);
    fs.writeFile(`./server/database/records/records-${difficult}.json`, JSON.stringify(scoreList), err => console.log(err));
    return;
  }

  for (let i = 0; i < scoreList.length - 1; i++) {
    if (scoreList[i].score >= newScore.score && scoreList[i+1].score < newScore.score) {
      scoreList.splice(i + 1, 0, newScore);
      fs.writeFile(`./server/database/records/records-${difficult}.json`, JSON.stringify(scoreList), err => console.log(err));
      return;
    }
  }
}
