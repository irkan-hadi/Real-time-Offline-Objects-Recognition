import { Component, OnInit } from '@angular/core';
//import COCO-SSD model as cocoSSD (pre-trained object prediction and detection model)
import * as cocoSSD from '@tensorflow-models/coco-ssd';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  private video: HTMLVideoElement;

  public isCameraLoading: boolean;
  public isModelLoading: boolean;
  public isError: boolean;
  public errorMessage: string;

  private color_map = new Map<string, string>();
  // TODO: Allow user to switch camera
  public camera_face: string;
  //  public camera_button_text: string;
  //  public isButtonDisabled: boolean;
  //  public DisabledClass: string;


  ngOnInit() {

    this.isCameraLoading = true;
    this.isModelLoading = true;
    this.isError = false;
    // Get feed from Rear Camera
    this.camera_face = "environment";

    // Start camera and the predict and detect process
    this.start_camera();
    this.predict_and_detect();


  }


  // FlipCamera() {

  //   this.camera_face==="environment"?this.camera_face="user":this.camera_face="environment";
  //   this.camera_button_text==="Switch To Selfie Cam"?this.camera_button_text="Switch To Back Cam":this.camera_button_text="Switch To Selfie Cam";
  //   this.isButtonDisabled=true;
  //   this.DisabledClass="disabled";
  //   this.start_camera();
  //   this.predect_and_detect();

  // }


  start_camera() {

    this.video = <HTMLVideoElement>document.getElementById("videoBox");



    // Get video feed with some constrains
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: this.camera_face },
          frameRate: { min: 25, ideal: 60, max: 60 },

        }
      })
      .then(
        stream => {

          this.video.srcObject = stream;
          this.video.onloadedmetadata = () => {
            this.video.play();
            this.isCameraLoading = false;
            this.isError = false;
            //this.isButtonDisabled=false;
            //this.DisabledClass="";

          };
        })
      .catch(error => {
        // Show error to user (if device is not supported or no permission is given)
        this.isCameraLoading = false;
        this.isModelLoading = false;
        console.log(error);
        this.isError = true;
        this.errorMessage = error;

      });
  }

  public async predict_and_detect() {
    // Load model from assets (offline support!)
    const model = await cocoSSD.load(
      {
        base: 'lite_mobilenet_v2',
        modelUrl: 'assets/model.json'
      }

    );

    try {
      this.detectFrame(this.video, model);

      this.isError = false;
      this.errorMessage = "";
      this.isModelLoading = false;
    }
    catch (error) {
      this.isCameraLoading = false;
      this.isModelLoading = false;
      this.isError = true;
      console.log(error);
      this.errorMessage = error;

    }

  }

  // Get frames and predict
  detectFrame = (video, model) => {
    model.detect(video).then(predictions => {
      this.renderPredictions(predictions);
      requestAnimationFrame(() => {
        this.detectFrame(video, model);

      });
    });
  }

  renderPredictions = predictions => {
    const canvas = <HTMLCanvasElement>document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let box_color = "";
    const font_color = "#000000";

    canvas.width = 350;
    canvas.height = 450;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const font = "18px Arial";
    ctx.font = font;
    ctx.textBaseline = "top";
    ctx.drawImage(this.video, 0, 0, 350, 450);


    // Loop through all predictions
    predictions.forEach(prediction => {
      // Get the points of the predicted boxes
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Get the predicted class and the confident score
      const objecttype = prediction.class;
      const detection_score = prediction.score;

      // Get random HSL color for each object class detected (decided to use HSL instead of HEX because its easier to generate light colors)
      if (!this.color_map.has(objecttype)) {

        let random_light_hsl_color = "hsl(" + 360 * Math.random() + ',' +
          (25 + 70 * Math.random()) + '%,' +
          (30 + 48 * Math.random()) + '%)';
        this.color_map.set(objecttype, random_light_hsl_color);

      }

      box_color = this.color_map.get(objecttype);


      // Draw the bounding box.
      ctx.strokeStyle = box_color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = box_color;
      const textWidth = ctx.measureText(objecttype + " | " + "00.0%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

      // Text style
      ctx.fillStyle = font_color;
      // Show the class and confident score in percentage
      ctx.fillText(objecttype + ' | ' + (detection_score * 100.0).toFixed(1) + "%", x, y);

    });


  };

}
