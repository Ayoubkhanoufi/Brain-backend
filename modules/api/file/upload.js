module.exports = (brain, cb) => {
    const path = require('path');
    const express = require('express');
    const multer = require('multer');
    const fs = require("fs")

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'assets/uploads')
        },
        filename: function (req, file, cb) {
            // You could rename the file name
            var ext = path.extname(file.originalname);
            var fullName = path.basename(file.originalname, ext);

            cb(null, file.fieldname + '-' + fullName + ext)
        }
    });

    var upload = multer({ storage: storage }).any();

    // Upload file
    brain.pulse.router.post("/upload/", upload, (req, res) => {
        return res.json({
            file: req.file
        });
    });

    // All file 
    brain.pulse.router.get("/upload/:nr", (req, res) => {

        const { nr } = req.params;
        var directoryPath = path.join('assets/uploads')
        let allFile = [];

        fs.readdir(directoryPath, function (err, files) {
            files.forEach(function (file) {
                const split = file.split('-').slice(0, 1);
                if (split == nr) {
                    allFile.push({ file })
                }
            })
            //console.log(JSON.stringify(allFile))
            return res.json(allFile);
        })
    });
    cb();
};  
