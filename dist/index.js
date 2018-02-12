"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const logger = __importStar(require("./lib/logger"));
const bluebird_1 = require("bluebird");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const util_1 = require("./lib/util");
const multiplier = 60 * 1000;
var recordNames;
var localInterface = false;
const verifyConfigs = () => {
    var errors = [];
    if (!process.env.DO_API_KEY) {
        errors.push("DO_API_KEY");
    }
    if (!process.env.DOMAIN_NAME) {
        errors.push("DOMAIN_NAME");
    }
    if (!process.env.RECORD_NAME) {
        errors.push("RECORD_NAME");
    }
    if (!process.env.RECORD_TYPE) {
        process.env.RECORD_TYPE = 'A';
    }
    if (!process.env.INTERVAL) {
        process.env.INTERVAL = '60';
    }
    return errors;
};
const run = () => {
    logger.info("Getting " + (localInterface ? "internal" : "external") + " IP...");
    util_1.Util.getIp(localInterface)
        .then((myIp) => {
        if (myIp) {
            logger.info("IP: " + myIp);
            logger.info("Finding domain \"" + process.env.DOMAIN_NAME + "\"");
            return [myIp, util_1.Util.findDomain(process.env.DOMAIN_NAME)];
        }
        else
            throw new Error("Unable to get " + (localInterface ? "internal" : "external") + " IP");
    }).spread((myIp, domain) => {
        if (domain) {
            logger.info('Domain found');
            logger.info('Finding DNS Record [' + recordNames.join(' | ') + '].' + domain.name + ' (Type: ' + process.env.RECORD_TYPE + ')');
            return [myIp, domain, util_1.Util.findDomainRecord(domain.name, process.env.RECORD_TYPE, recordNames, myIp)];
        }
        else {
            throw new Error("Unable to find domain");
        }
    }).spread((myIp, domain, dnsRecords) => {
        if (dnsRecords && dnsRecords.length > 0) {
            const promises = [];
            dnsRecords.forEach((dnsRecord) => {
                if (dnsRecord.data != myIp) {
                    logger.info('Updating ' + dnsRecord.name + '.' + domain.name + ' to ' + myIp);
                    promises.push(util_1.Util.updateDomainRecord(domain.name, dnsRecord.id, { data: myIp }));
                }
                else {
                    logger.info(dnsRecord.name + '.' + domain.name + ' doesn\'t need to be updated');
                }
            });
            return [myIp, domain, dnsRecords, bluebird_1.Promise.all(promises)];
        }
        else
            throw new Error("Unable to find DNS Record");
    }).spread((myIp, domain, dnsRecord, updateds) => {
        updateds.forEach((item) => {
            logger.info('Updated ' + item.name + '.' + domain.name + ' => ' + item.data);
        });
        setTimeout(run, parseInt(process.env.INTERVAL) * multiplier);
    })
        .catch((e) => {
        logger.error(e);
        setTimeout(run, parseInt(process.env.INTERVAL) * multiplier);
    });
};
const configsRes = verifyConfigs();
if (configsRes.length == 0) {
    recordNames = process.env.RECORD_NAME.split(',');
    logger.info('Configs: ');
    logger.info('\t- DO_API_KEY: ' + process.env.DO_API_KEY);
    logger.info('\t- DOMAIN_NAME: ' + process.env.DOMAIN_NAME);
    logger.info('\t- RECORD_NAME: ' + recordNames.join(','));
    logger.info('\t- DOMAIN_TYPE: ' + process.env.RECORD_TYPE);
    logger.info('\t- INTERVAL: ' + process.env.INTERVAL);
    if (process.env.LOCAL_INTERFACE) {
        logger.info('\t- LOCAL_INTERFACE: ' + process.env.LOCAL_INTERFACE);
        if (util_1.Util.existsLocalInterface(process.env.LOCAL_INTERFACE))
            localInterface = true;
        else {
            logger.error("Local interface " + process.env.LOCAL_INTERFACE + " not found.");
            process.exit(1);
        }
    }
    run();
}
else {
    logger.error("The following environment variables are missing:");
    configsRes.forEach(function (element) {
        logger.error("\t- " + element);
    });
    process.exit(1);
}
