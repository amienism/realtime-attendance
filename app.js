require('dotenv').config();
const ZKLib = require('./zklib');
const axios = require('axios');
const dayjs = require('dayjs');
const fs = require('fs');
const { stringify } = require('querystring');

const ip = process.env.DEVICE_IP;
const api_url = process.env.APP_API;
const path_log = "./log.txt";
const now = dayjs().format('DD-MM-YYYY HH:mm:ss');

const realtime_attendence = async () => {
    const zkInstance = new ZKLib(ip, 4370, 10000, 4000, 0);
    let isConnected = false;

    try {
        // create connection with the device
        fs.appendFileSync(path_log, `${now}\t Trying to connect to DEVICE IP : ${ip}\n`);
        await zkInstance.createSocket()
        fs.appendFileSync(path_log, `${now}\t Connection Established to DEVICE IP : ${ip}\n`);

        isConnected = true;
    } catch (e) {
        await axios.post(process.env.WAPI_URL, null, {
            params: {
                api_key: process.env.WAPI_API_KEY,
                device_key: process.env.WAPI_DEVICE_KEY,
                destination: "",
                message: `Realtime Attendace Connection ERROR, Restarting .... \n\nError detail: ${stringify(e)}`
            }
        });

        fs.appendFileSync(path_log, `${now}\t Connection ERROR, Restarting ...\n`);
    }

    if(isConnected){
        zkInstance.getRealTimeLogs(async (err, attendance) => {
            if (err) {
                fs.appendFileSync(path_log, `${now}\t Error in registering real time event: ${err}\n`);
            }
    
            const value = {
                'user_id': attendance.userId,
                'scan': dayjs(attendance.attTime).format(),
            };
    
            try {
                const response = await axios.post(api_url, value);
                fs.appendFileSync(path_log, `${now}\t Success send data with user id ${value.user_id} to API. Response from server : ${response.data}\n`);
            } catch (error) {
                await axios.post(process.env.WAPI_URL, null, {
                    params: {
                        api_key: process.env.WAPI_API_KEY,
                        device_key: process.env.WAPI_DEVICE_KEY,
                        destination: "",
                        message: `Theres an error in registering realtime attendance event to API with user id ${value.user_id}. Error detail: ${error}`
                    }
                });
                await axios.post(process.env.WAPI_URL, null, {
                    params: {
                        api_key: process.env.WAPI_API_KEY,
                        device_key: process.env.WAPI_DEVICE_KEY,
                        destination: "",
                        message: `Theres an error in registering realtime attendance event to API with user id ${value.user_id}. Error detail: ${error}`
                    }
                });
                fs.appendFileSync(path_log, `${now}\t Theres an error in registering realtime attendance event to API with user id ${value.user_id}. Error detail: ${error}\n`);
            }
        });
    } else {
        return realtime_attendence();
    }

}

realtime_attendence();