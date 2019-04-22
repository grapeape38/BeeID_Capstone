const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const fs = require('fs');

const builddir = __dirname + "/dist";
app.use(express.static(builddir));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: builddir });
});

app.get("/getVideos", (req, res) => {
  fs.readdir(builddir + '/videos', (error, files) => {
    if (error) throw error;
    let next_id = 1;
    let videos = files.map(file => ({id: next_id++, url: 'videos/' + file, name: file, thumb: 'thumb/' + file.split('.')[0] + '.png'}));
    res.status(200).json(
      { videos: videos }
    );
  })
});

app.listen(process.env.PORT || 8080);
