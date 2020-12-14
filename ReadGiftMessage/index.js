const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const TYPES = require('tedious').TYPES;
const { v4: uuidv4 } = require('uuid');

class SqlParameter {
    constructor(name, type, value) {
        this.name = name;
        this.type = type;
        this.value = value;
    }
}

async function connectToDb(config) {
    const connection = new Connection(config);
    return new Promise((resolve, reject) => {
        connection.on('connect', function(err) {
            if (err != null) {
                reject(err);
                return;
            }
            resolve(connection);
        });
    });
}

async function executeUpdate(connection, sql, parameters) {
    return new Promise((resolve, reject) => {
        const request = new Request(sql, function(err, rowCount) {
            if (err != null) {
                reject(err);
                return;
            }
            resolve(rowCount);
        });

        for (const parameter of parameters) {
            request.addParameter(parameter.name, parameter.type, parameter.value);
        }

        connection.execSql(request);
    });
}

module.exports = async function(context, giftMessage) {
    context.log('Received gift message', giftMessage);

    const config = JSON.parse(process.env.GIFTS_DB_CONFIG);
    try {
        connection = await connectToDb(config);
        context.log('Connected to gifts database');
    } catch (error) {
        context.log('Could not connect to gifts database', error);
        throw error;
    }

    const sql = "INSERT INTO gifts " +
        "(id, length, width, height, production_line, recipient, creation_date) " +
        "VALUES (@id, @length, @width, @height, 'eric-galluzzo', @recipient, CURRENT_TIMESTAMP)";
    const parameters = [
        new SqlParameter('id', TYPES.NVarChar, uuidv4()),
        new SqlParameter('length', TYPES.Decimal, giftMessage.giftBoundingBox.length),
        new SqlParameter('width', TYPES.Decimal, giftMessage.giftBoundingBox.width),
        new SqlParameter('height', TYPES.Decimal, giftMessage.giftBoundingBox.height),
        new SqlParameter('recipient', TYPES.NVarChar, giftMessage.recipient)
    ];

    try {
        await executeUpdate(connection, sql, parameters);
    } catch (error) {
        context.log('Error executing insert statement', error);
        throw error;
    }

    context.log('Wrote gift message to database');
};
