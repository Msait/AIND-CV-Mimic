// Mimic Me!
// Fun game where you need to express emojis being displayed
// --- Affectiva setup ---

// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0];  // div node where we want to add these elements
var width = 640, height = 480;  // camera image size
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;  // face mode parameter

// Initialize an Affectiva CameraDetector object
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);

// Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

// ******************************************************************************************************************** //
// --- Utility values and functions ---

// Unicode values for all emojis Affectiva can detect
var emojis = [ 128528, 9786, 128515, 128524, 128527, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ];
var questionMarkUnicode = 63;
var idx = 0; // Current emoji index user should guess
var startTime = 0; // time to track game start
var playTime = 25; // total play time for single round (in seconds)
var thresholdInSeconds = 1; // period to fix mimic emoji 
var gameType = "type2"; // use global var for tracking game type and set default value for game type
var sequenceLengthToMimic = 10; // max emojis in sequence to mimic
var emojiSeq = []; // sequence of emoji to mimic if gameType == type2 
var timeToMimicEmojiInSeqSeconds = 5;
var currentEmojiIdxToMimic = -1; // used only for sequence game type to highlight current emoji to mimic
// ******************************************************************************************************************** //
$('#gameType option[value="'+gameType+'"]').attr("selected",true);
gameTypeHandler(
    function(){
      totalFacesToMimic = 5;
      $("#nextEmoji").show();
    },
    function(){
      totalFacesToMimic = sequenceLengthToMimic;
      $("#nextEmoji").hide();
    }
  );
$('#gameType').on('change', function(){
  onSelectChange(this.value);
});

// Update target emoji being displayed by supplying a unicode value
function setTargetEmoji(code) {
  $("#target").html("&#" + code + ";");
}

// Convert a special character to its unicode value (can be 1 or 2 units long)
function toUnicode(c) {
  if(c.length == 1)
    return c.charCodeAt(0);
  return ((((c.charCodeAt(0) - 0xD800) * 0x400) + (c.charCodeAt(1) - 0xDC00) + 0x10000));
}

// Update score being displayed
function setScore(correct, total) {
  $("#score").html("Score: " + correct + " / " + total);
}

// Display log messages and tracking results
function log(node_name, msg) {
  $(node_name).append("<span>" + msg + "</span><br />")
}

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    $("#logs").html("");  // clear out previous log
    detector.start();  // start `detector`
  }
  log('#logs', "Start button pressed. Game type: " + getGameType().text());
  setTargetEmoji(questionMarkUnicode); 
  score = 0;

  gameTypeHandler(
    function(){ totalFacesToMimic = 5; }, 
    function(){
      $("#logs").html("Time to mimic each emoji " + timeToMimicEmojiInSeqSeconds + ". And will summarize if you mimic faster.");  
      totalFacesToMimic = sequenceLengthToMimic;
    });
  setScore(score, totalFacesToMimic);
}

// Stop button
function onStop() {
  log('#logs', "Stop button pressed");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();  // stop detector
  }
};

// Reset button
function onReset() {
  log('#logs', "Reset button pressed");
  if (detector && detector.isRunning) {
    detector.reset();
    initTheGame();
  }
  $('#results').html("");  // clear out results
  $("#logs").html("");  // clear out previous log

  // TODO(optional): You can restart the game as well
  // <your code here>
  currentEmojiIdxToMimic = 0;
  emojiSeq = [];
  $('span[id^=emo]').css("border", "");
  setTargetEmoji(questionMarkUnicode);
  score = 0;
   console.log("Reset");
};

// Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
  log('#logs', "Webcam access allowed");
});

// Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
  log('#logs', "webcam denied");
  console.log("Webcam access denied");
});

// Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", function() {
  log('#logs', "The detector reports stopped");
  $("#results").html("");
});

// Add a callback to notify when the detector is initialized and ready for running
detector.addEventListener("onInitializeSuccess", function() {
  log('#logs', "The detector reports initialized");
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block");
  $("#face_video").css("display", "none");

  // TODO(optional): Call a function to initialize the game, if needed
  // <your code here>
  initTheGame();

});

// Add a callback to receive the results from processing an image
// NOTE: The faces object contains a list of the faces detected in the image,
//   probabilities for different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
  var canvas = $('#face_video_canvas')[0];
  if (!canvas)
          return;

  // Report how many faces were found
  $('#results').html("");
  log('#results', "Timestamp: " + timestamp.toFixed(2));
  log('#results', "Number of faces found: " + faces.length);
  if (faces.length > 0) {
    // Report desired metrics
    log('#results', "Appearance: " + JSON.stringify(faces[0].appearance));
    log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
            return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
            return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Emoji: " + faces[0].emojis.dominantEmoji);

    // Call functions to draw feature points and dominant emoji (for the first face only)
    drawFeaturePoints(canvas, image, faces[0]);
    drawEmoji(canvas, image, faces[0]);

    // TODO: Call your function to run the game (define it first!)
    // <your code here>
    runTheGame(faces, image, timestamp);
  }
});


// --- Custom functions ---

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  // TODO: Set the stroke and/or fill style you want for each feature point marker
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#Fill_and_stroke_styles
  // <your code here>
  var radius = 2;
  ctx.strokeStyle = '#fff';
  // Loop over each feature point in the face
  for (var id in face.featurePoints) {
    var featurePoint = face.featurePoints[id];

    // TODO: Draw feature point, e.g. as a circle using ctx.arc()
    // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
    // <your code here>
    ctx.beginPath(); 
    ctx.arc(featurePoint.x,featurePoint.y, radius, 0, 2 * Math.PI );
    // ctx.fillText("" + id, featurePoint.x, featurePoint.y)
    ctx.stroke();
  }
}

// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  // TODO: Set the font and style you want for the emoji
  // <your code here>
  ctx.font = '4em tahoma';
  var distX = Math.abs(face.featurePoints[9].x - face.featurePoints[10].x);
  var distY = Math.abs(face.featurePoints[9].y - face.featurePoints[10].y);
  // console.log("("+face.featurePoints[10].x+distX + ", " + face.featurePoints[10].y+distY + ")")
  // TODO: Draw it using ctx.strokeText() or fillText()
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
  // TIP: Pick a particular feature point as an anchor so that the emoji sticks to your face
  // <your code here>
        
  ctx.fillText(face.emojis.dominantEmoji, face.featurePoints[10].x+distX, face.featurePoints[10].y + distY);
}

// TODO: Define any variables and functions to implement the Mimic Me! game mechanics

// NOTE:
// - Remember to call your update function from the "onImageResultsSuccess" event handler above
// - You can use setTargetEmoji() and setScore() functions to update the respective elements
// - You will have to pass in emojis as unicode values, e.g. setTargetEmoji(128578) for a simple smiley
// - Unicode values for all emojis recognized by Affectiva are provided above in the list 'emojis'
// - To check for a match, you can convert the dominant emoji to unicode using the toUnicode() function

// Optional:
// - Define an initialization/reset function, and call it from the "onInitializeSuccess" event handler above
// - Define a game reset function (same as init?), and call it from the onReset() function above

// <your code here>
function initTheGame() {
  setNextEmojiToMimic();
  startTime = getCurrentTimestampInSec();
  currentEmojiIdxToMimic = 0;
}

// update html placeholder with random emoji
function setNextEmojiToMimic() {
  if (gameType === 'type1') {
    idx = getNextEmojiToMimic();
    // update emoji with new value for certain time
    setTargetEmoji(emojis[idx]);
    console.log("Set emoji to mimic: " + emojis[idx]);  
  } else if (gameType === 'type2') {
    setNextEmojiSequenceToMimic(); 
  }       
}

// get random emoji array index 
function getNextEmojiToMimic() {
  // choose random emoji
  max_idx = emojis.length;
  idx = Math.floor((Math.random() * max_idx));
  return idx;
};

// update html placeholder with random emoji sequence
function setNextEmojiSequenceToMimic() {
  for (i = 0; i < sequenceLengthToMimic; i++){
    emojiSeq.push( emojis[ getNextEmojiToMimic() ] );  
  }

  setTargetEmojiSequence(emojiSeq);
  console.log("Set emoji sequence to mimic: " + emojiSeq);
};

function runTheGame(faces, image, timestamp) {
  var face = faces[0];
  gameTypeHandler(
    function(){ playTimeChallenge(face); }, 
    function(){ playSequenceChallenge(face); }
  );
};

function playTimeChallenge(face){
  var currentTimeInSec = getCurrentTimestampInSec();
  if (currentTimeInSec - startTime >= playTime || score >= totalFacesToMimic) {
    log('#logs', "Congrats! Your score is: " + score + ". Play time: " + (currentTimeInSec - startTime) + " sec.");
    idx = 0;   
    console.log("End of Game by TIMEOUT. Your score is " + score);                     
    onStop();
  }
  if (typeof fixationTime === 'undefined') {
    fixationTime = 0;
  }
  if (toUnicode(face.emojis.dominantEmoji) == emojis[idx]) {
    if (fixationTime == 0) {
        fixationTime = getCurrentTimestampInSec();
    }
    if ((currentTimeInSec - fixationTime) > thresholdInSeconds){
        console.log("You successfuly mimic. Your score now: " + ++score);
        setScore(score, totalFacesToMimic);
        setNextEmojiToMimic();
        fixationTime = 0;
    }
  }
};

function playSequenceChallenge(face){
  // clear previous highlight except green and highlight current emoji in sequence to mimic
  $('span[id^=emo]').filter(".currentHighlight").removeClass("currentHighlight");
  $('#emo'+currentEmojiIdxToMimic).addClass("currentHighlight");

  var currentTimeInSec = getCurrentTimestampInSec();
  var roundPlayTime = sequenceLengthToMimic * timeToMimicEmojiInSeqSeconds;

  if ((currentTimeInSec - startTime >= roundPlayTime) || (currentEmojiIdxToMimic >= sequenceLengthToMimic)) {
    log('#logs', "Congrats! Your score is: " + score + ". Play time: " + Math.floor(roundPlayTime) + " sec.");  
    console.log("End of Game by TIMEOUT. Your score is " + score);                     
    onStop();
  }

  if (typeof fixationTime === 'undefined') {
    fixationTime = 0;
  }
  
  if (toUnicode(face.emojis.dominantEmoji) == emojiSeq[currentEmojiIdxToMimic]) {
    
    if (fixationTime == 0) {
        fixationTime = getCurrentTimestampInSec();
    }
    if ((currentTimeInSec - fixationTime) > thresholdInSeconds){
        console.log("You successfuly mimic current emoji. Your score now: " + ++score);
        $('#emo'+currentEmojiIdxToMimic).css("border-top", "10px solid green");
        setScore(score, totalFacesToMimic);
        // go next one emoji
        currentEmojiIdxToMimic += 1;
        fixationTime = 0;
    }
  }

  // shift to next emoji in sequence by timeout
  if (startTime > timeToMimicEmojiInSeqSeconds) {
    var alreadyPassedEmojiTillNowInSeconds = startTime + timeToMimicEmojiInSeqSeconds * (currentEmojiIdxToMimic+1);
    var shouldShift = (currentTimeInSec - alreadyPassedEmojiTillNowInSeconds);
    if (Number.isInteger(shouldShift) == true && shouldShift > 0){
      console.log("Change to next emoji caused by timeout: " + shouldShift);
      currentEmojiIdxToMimic += 1;
    }  
  }
  
};

function getCurrentTimestampInSec(){
  return Math.floor(Date.now() / 1000);
}

// Next emoji button
function onNext() {
  log('#logs', "Next Emoji button pressed");
  if (detector && detector.isRunning) {
    gameTypeHandler(function(){
      setNextEmojiToMimic();  
    });
    
  }
};

function gameTypeHandler(func1, func2) {
  switch (gameType) {
    case "type1":
      if (typeof(func1) === typeof(Function))
        func1();
      break;
    case "type2":
      typeof(func2) === typeof(Function)
      func2();
      break;
  }
}

// get game type option
function getGameType(){
  return $("#gameType").find(':selected');
};

// event on change event type
function onSelectChange(value) {
  onStop();
  console.log("Game type was changed to " + value);
  log('#logs', "Game type was changed to \"" + getGameType().text() + "\"");
  gameType = value;

  gameTypeHandler(
    function(){
      totalFacesToMimic = 5;
      $("#nextEmoji").show();
    },
    function(){
      totalFacesToMimic = sequenceLengthToMimic;
      $("#nextEmoji").hide();
    }
  );
  setScore(score, totalFacesToMimic);
};

// Update target emoji sequence being displayed by supplying a unicode value
function setTargetEmojiSequence(codes) {
  var _codes = [];
  for (i =0; i < codes.length; i++){
    _codes.push("<span id=\"emo"+i+"\">&#" + codes[i] + ";</span>");
  }
  $("#target").html(_codes.join(""));
};