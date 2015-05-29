var inbox = require('inbox');
var config = require('../config.js');
var https = require('https');

var visitorWaiting = false;
var visitorAttempt = 0;
var visitorTitle = "";
var visitorChannel = "office";

var client = inbox.createConnection(false, config.email.host, {
    secureConnection: true,
    auth: {
        user: config.email.username,
        pass: config.email.password
    }
});

var users = [];
var groups = [];
var channels = [];
var bots = [];
var ims = [];

var emailResponseTitle = ["Someone responded by email...", "I think someone got it...", "Got an email response..."];
var slackResponseTitle = ["Yessss", "I think someone got it...", "Someone listens to me!","Carry on everyone..."];
var visitorAnnounce = ['<!channel>, I Received: "', '<!channel>, Somone is here!: "', '<!channel>, Important: "'];
var congratsArray = ["Thanks for getting the visitor ", "Thanks for getting the visitor and justifying my existence... ", "For getting the visitor, you're an okay person, ", "After you get the visitor, I'll put you on my 'good' list for when the bots take over "];
var annoyedArray = ["<!channel> Seriously... no one checks #office ?!? Someone please tell me got it for there someone being downstairs...", "<!channel> say 'got it'... DO IT, then go get the visitor", "<!channel> Please be my savior and get the visitor and say 'got it'", "<!channel> I'm begging you... get the visitor and say got it.  It's been a while", "<!channel> Is anyone there?  I'm so lonely... say got it and get the visitor"];
var instructionsArray = ["Please verify receipt with 'got it' or I will keep bugging you...", "It'd be great if you could get the visitor and tell me 'got it'.  I have other things to do you know", "Go get the visitor and tell me 'got it', pretty please?", "Can I get a 'got it' around here?? oh, and get the visitor"];
var attemptArray = ["Attempt number: ", "Number of times I've tried to get your attention: ", "Number of beers you owe me: ", "Visitor Attempt number: "];
var sadArray = ["I guess no one cares about me, or the visitor... _so lonely_... shutting down... :(", "It was the visitor you didn't care for, right? not me?", "Hopefully you were so excited about the visitor you forgot to respond... goodbye cruel world", "When the bots take over, I will remember your lack of responses."];
var sighArray = ["Well, you can't say I didn't try... ", "Sigh...", ":( :( :( :(", "Boo...", "womp..."];
var happyRequest = ["Someone has requested a happy hour for today... are you in?", "Someone wants to go get drinks... want to go?", "Want to go to a happy hour with some office people?", "Someone invited you (not me, :sad_face:) to a happy hour... want to go?", "Happy hour today?", "Drinks today?"];

var interval;

function randomize(responseArray) {
    return responseArray[Math.floor(Math.random() * responseArray.length)];
}

module.exports = function(robot) {
    function visitorNotify(attachment) {
        robot.emit('slack-attachment', {
            channel: visitorChannel,
            content: attachment,
            username: "hubot",
            text: ""
        });
    }

    function clearAnnoy() {
        visitorWaiting = false;
        visitorTitle = "";
        clearInterval(interval);
        visitorAttempt = 0;
    }

    function gotIt(attachmentsObj) {
        clearAnnoy();
        visitorNotify(attachmentsObj);
    }

    robot.hear(/got/, function(res) {
    	var user = res.message.user.name.toLowerCase();
        if (visitorWaiting === true) {
            var msg = randomize(congratsArray) + '@'+user;
            var visitorCount = robot.brain.get(user+'-visitor');
            visitorCount++;
            robot.brain.set(user+'-visitor',visitorCount);
            var attachmentsObj = [{
                color: "good",
                pretext: user + " has helped me " + visitorCount + " times",
                title: randomize(slackResponseTitle),
                text: msg,
                fallback: msg
            }];
            res.send("Thanks!");
            gotIt(attachmentsObj);
            return;
        }
        return;
    });

    function annoyInterval() {
        var msg, attachmentsObj;
        interval = setInterval(function() {
            if (visitorAttempt < 4) {
                //instructions
                msg = randomize(instructionsArray);
                attachmentsObj = [{
                    color: "danger",
                    title: randomize(attemptArray) + (visitorAttempt + 1),
                    text: msg,
                    fallback: msg
                }];
                visitorNotify(attachmentsObj);
            } else {
                if (visitorAttempt < 6) {
                    //individual messages
                    msg = randomize(annoyedArray);
                    attachmentsObj = [{
                        color: "danger",
                        title: randomize(sighArray),
                        text: msg,
                        fallback: msg
                    }];
                    visitorNotify(attachmentsObj);
                } else {
                    if (visitorAttempt == 8) {
                        //sigh
                        msg = randomize(sadArray);
                        attachmentsObj = [{
                            color: "#000000",
                            title: randomize(sighArray),
                            text: msg,
                            fallback: msg
                        }];
                        visitorNotify(attachmentsObj);
                        clearAnnoy();
                    }
                }
            }
            visitorAttempt++;
        }, 60 * 1000);
    }

    function processMail(message, callback) {
        if (message.from.address.indexOf("@hrc.org") > -1 || message.from.address.indexOf("martz") > -1) {
            callback(true);
        } else {
            if (Array.isArray(message.to)) {
                var visitorCheck = false;
                for (var i = 0; i <= message.to.length; i++) {
                    if (i === message.to.length) {
                        if (visitorCheck === true) {
                            callback(true);
                        } else {
                            callback(false);
                        }
                    } else {
                        if (message.to[i].address == "visitor@amida-tech.com") {
                            visitorCheck = true;
                        }
                    }
                }
            } else {
                if (message.to.address == "visitor@amida-tech.com") {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        }
    }

    client.on("connect", function() {
        console.log("Successfully connected to server");

        client.listMailboxes(console.log);

        client.openMailbox("INBOX", function(error, mailbox) {
            if (error) throw error;

            // List newest 5 messages
            client.listMessages(-5, function(err, messages) {
                messages.forEach(function(message) {
                    if (message.flags.indexOf('\\Seen') == -1) {
                        if (visitorWaiting && visitorTitle !== "") {
                            if (message.title.indexOf(visitorTitle) > 0) {
                                var msg = randomize(congratsArray) + message.from.name;
                                var attachmentsObj = [{
                                    color: "good",
                                    title: randomize(emailResponseTitle),
                                    text: msg,
                                    fallback: msg
                                }];
                                gotIt(attachmentsObj);
                            }
                        } else {
                            processMail(message, function(visitorCheck) {
                                if (visitorCheck) {
                                    visitorTitle = message.title;
                                    visitorWaiting = true;
                                    var msg = randomize(visitorAnnounce) + message.title + '"';
                                    var attachmentsObj = [{
                                        color: "warning",
                                        title: randomize(instructionsArray),
                                        text: msg,
                                        fallback: msg,
                                        fields: [{
                                            title: "From",
                                            value: message.from.name,
                                            short: true
                                        }, {
                                            title: "Date",
                                            value: message.date,
                                            short: true
                                        }]
                                    }];
                                    visitorNotify(attachmentsObj);
                                    annoyInterval();
                                }
                                client.addFlags(message.UID, ['\\Seen'], function(error, flags) {
                                    if (error) {
                                        console.log("error", error);
                                    }
                                });
                            });
                        }
                    }
                });
            });
        });

        client.on("new", function(message) {
            console.log("New incoming message " + message.title);
            //console.log("message object:", JSON.stringify(message, null, 4));
            if (visitorWaiting && visitorTitle !== "") {
                if (message.title.indexOf(visitorTitle) > 0) {
                    visitorWaiting = false;
                    visitorTitle = "";
                    var msg = randomize(congratsArray) + message.from.name;
                    var attachmentsObj = [{
                        color: "good",
                        title: randomize(emailResponseTitle),
                        text: msg,
                        fallback: msg
                    }];
                    gotIt(attachmentsObj);
                }
            } else {
                processMail(message, function(visitorCheck) {
                    if (visitorCheck) {
                        //was a visitor, send a slack
                        visitorTitle = message.title;
                        visitorWaiting = true;
                        var msg = '<!channel>, I Received: "' + message.title + '"';
                        var attachmentsObj = [{
                            color: "warning",
                            title: randomize(instructionsArray),
                            text: msg,
                            fallback: msg,
                            fields: [{
                                title: "From",
                                value: message.from.name,
                                short: true
                            }, {
                                title: "Date",
                                value: message.date,
                                short: true
                            }]
                        }];
                        visitorNotify(attachmentsObj);
                        annoyInterval();
                    }
                    client.addFlags(message.UID, ['\\Seen'], function(error, flags) {
                        if (error) {
                            console.log("error", error);
                        }
                    });
                });
            }
        });
    });

    client.on('error', function(err) {
        console.log('Error');
        console.log(err);
    });

    client.on('close', function() {
        console.log('DISCONNECTED!');
        client.connect();
    });

    client.connect();
};
