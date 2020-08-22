'use strict';
process.env['PATH'] = process.env['PATH'] + ':' + (process.env['LAMBDA_TASK_ROOT'] + '/bin/exiftool')

const aws = require('aws-sdk')
const multipartParser = require('lambda-multipart-parser');
const to = require('await-to-js').default;
const fs = require('fs').promises
const { exec } = require('child_process');

const uploadFile = (file, filePath) => {
  return new Promise((resolve, reject) => {
    const s3 = new aws.S3()

    s3.upload({
      Bucket: process.env.s3Bucket,
      Key: `${filePath}/${file.filename}`,
      ContentType: file.contentType,
      Body: file.content
    }, err => {
      if (err) {
        return reject(err)
      }

      return resolve()
    })
  })
}

const storeExifData = (filePath, data) => {
  return new Promise(async (resolve, reject) => {
    const fileLocation = `/tmp/${filePath}`
    await fs.writeFile(fileLocation, data)

    exec(`perl ${__dirname}/bin/exiftool/exiftool ${fileLocation} -j`, async (error, stdout, stderr) => {
      await fs.unlink(fileLocation)
      if (error) {
        console.log(error.stack);
        console.log('Error code: '+error.code);
        console.log('Signal received: '+error.signal);

        return reject(error)
      }

      const [errS3] = await to(uploadFile({
        filename: 'meta_data.json',
        contentType: 'application/json',
        content: stdout
      }, filePath))
      if (errS3) {
        return reject(errS3)
      }

      return resolve()
    });
  });
}

const formatResponse = (code, data) => {
  return {
    statusCode: code,
    body: JSON.stringify(data)
  }
}

module.exports.fileUpload = async (event, context, callback) => {
  if (!event.body) {
    return callback(null, formatResponse(400, { message: 'Request is empty' }));
  }

  const body = await multipartParser.parse(event);
  const filePath = Date.now();
  const file = body.files[0]
  if (!body.files || !body.files.length) {
    return callback(null, formatResponse(400, { message: 'No file provided' }));
  }

  const [errUpload] = await to(uploadFile(file, filePath))
  if (errUpload) {
    console.error('file upload error', errUpload);
    return callback(null, formatResponse(500, errUpload));
  }

  const [errExif] = await to(storeExifData(filePath, file.content));
  if (errExif) {
    console.error('exif error', errExif);
    return callback(null, formatResponse(500, errExif));
  }

  return callback(null, {
    statusCode: 200,
    body: JSON.stringify({ message: `File uploaded succesfully to ${filePath}/` })
  })
};
