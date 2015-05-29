var createCanduit = require('canduit');


function initPhab(config, robot) {
    var conduit = createCanduit(config, function(error, conduit) {});
    return robot.hear(/(?:^|[\[\s])([TDPQFV][0-9]+|r[A-Z]+[a-f0-9]+)(?:\s*(-v))?(?=\W|$)/g, function(msg) {
        var match;
        return conduit.exec('phid.lookup', {
            names: (function() {
                var i, len, ref, results;
                ref = msg.match;
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                    match = ref[i];
                    results.push(match.trim());
                }
                return results;
            })()
        }, function(error, result) {
            var hits, info, phid;
            if (error) {
                return;
            }
            hits = ((function() {
                var results;
                results = [];
                for (phid in result) {
                    info = result[phid];
                    results.push("^ " + info.fullName + " - " + info.uri);
                }
                return results;
            })()).join("\n");
            if (hits) {
                return msg.send(hits);
            }
        });
    });
};

exports.initPhab = initPhab;