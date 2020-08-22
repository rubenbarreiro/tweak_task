'use strict';
process.env['PATH'] = process.env['PATH'] + ':' + (process.env['LAMBDA_TASK_ROOT'] + '/bin/exiftool')

const aws = require('aws-sdk')
const multipartParser = require('lambda-multipart-parser');
const to = require('await-to-js').default;
const fs = require('fs').promises
const exif = require('exiftool');
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
    /*const fileLocation = `/tmp/${filePath}`
    console.log('\x1b[33m 33 handler.js > fileLocation === \x1b[0m ', fileLocation)
    await fs.writeFile(fileLocation, data)*/

    exif.metadata(data, async (err, metaData) => {
      if (err) {
        return reject(err)
      }

      const finalMetaData = {}
      for (const row in metaData) {
        finalMetaData[row] = metaData[row]
      }

      const [errS3] = await to(uploadFile({
        filename: 'meta_data.json',
        contentType: 'application/json',
        content: JSON.stringify(finalMetaData, null, 2)
      }, filePath))
      if (errS3) {
        return reject(errS3)
      }

      return resolve()
    })
  });
}

const formatResponse = (code, data) => {
  return {
    statusCode: code,
    body: JSON.stringify(data)
  }
}

module.exports.fileUpload = async (event, context, callback) => {
  const body = await multipartParser.parse(event);
  const filePath = Date.now();
  const file = body.files[0]

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
    body: JSON.stringify({ message: 'File uploaded succesfully' })
  })
};
