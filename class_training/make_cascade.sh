#!/bin/bash
mkdir $1_class
cd $1_class
ls -d ../bee_images/$1/good/* | awk '{print $1 " 1 0 0 80 80"}' > $1.dat
ls -d ../bee_images/$1/bad/* | awk '{print $1}' > bg.txt 
mkdir cascade_dir
opencv_createsamples -info $1.dat -vec $1.vec
opencv_traincascade -data cascade_dir -vec $1.vec -bg bg.txt -numPos 300 -numNeg 300 -numStages 15 -numThreads 4
cp cascade_dir/cascade.xml ../data/haarcascades/$1.xml

