# Tweak task

This task was made using serverless framework, before running the code, check the `README.md` inside `bin` directory to get the setup ready.

Current public endpoint is:
```
POST https://hlgbk8066h.execute-api.us-east-1.amazonaws.com/dev/file/upload
```

Running locally:
```
http://localhost:3000/dev/file/upload
```

Endpoint will require a file to be sent as a `multipart/form-data`

* Aws credencials must be provided in `~/.aws/credentials` file to get the s3 feature working.  
* Tested in ubuntu 18.04, to get exiftool work in other OS, look into https://exiftool.org/

### Runing locally
```
sls offline
```

Final note: There is no security or login/signup endpoints, to check uploaded images and json metadata, an IAM account is needed