'use strict';
const aws = require('aws-sdk')
const multipartParser = require('lambda-multipart-parser');
const to = require('await-to-js').default

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

module.exports.hello = async (event, context, callback) => {
  const body = await multipartParser.parse(event);
  const filePath = Date.now();
  const file = body.files[0]

  const [errUpload] = await to(uploadFile(file, filePath))
  if (errUpload) {
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify(errUpload)
    })
  }


  return callback(null, {
    statusCode: 200,
    body: JSON.stringify({ foo: 'bar' })
  })

  /*const body = multipart.parse(event, true)
  const s3 = new aws.S3()
  const filePath = Date.now()
  console.log('\x1b[33m 14 handler.js >  === \x1b[0m ', body)

  fs.writeFileSync(__dirname + '/foo.png', body.file.content)

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  })*/

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
