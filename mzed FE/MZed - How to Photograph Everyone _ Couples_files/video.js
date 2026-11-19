/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./resources/assets/js/video.js":
/*!**************************************!*\
  !*** ./resources/assets/js/video.js ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var iframe = document.querySelector('#mzed-player');
var player = new Vimeo.Player(iframe);
var logTime = 180; // log a view after this many seconds of watching

var logTimeComplete = 0;
var logVidComplete = 0;
var body = $('body');
var mzed_enabled = $('#mzed_enabled');
var module_id = $('#module_id');
var module_status = $('#module_status'); // var seconds will be the tracked time of the currently playing video.

var seconds = start_time = $('#progress').val();

if (Cookies.getJSON('autoplay') === undefined) {
  Cookies.set('autoplay', true);
}

$(function () {
  var playing_video;

  function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

    return !!pattern.test(str);
  } // this will set the starting time of the video if the user have already watched it.


  player.setCurrentTime(seconds); // whenever a video is played it will save information in the database.

  function playingVideoFunction() {
    playing_video = setInterval(function () {
      track_video_event(module_id.val(), 'playing', seconds);
    }, 20000);
  }

  function myStopFunction() {
    clearInterval(playing_video);
  }

  player.on('play', function (data) {
    track_video_event(module_id.val(), 'play', data.seconds);
    playingVideoFunction();
  });
  player.on('pause', function (data) {
    track_video_event(module_id.val(), 'pause', data.seconds);
    myStopFunction();
  });
  player.on('seeked', function (data) {
    setTimeout(function () {
      track_video_event(module_id.val(), 'seeked', data.seconds);
    }, 1500);
  });
  $('.transcript-time').on('click', function (e) {
    player.setCurrentTime($(this).data('start_time'));
  });
  player.on('timeupdate', function (data) {
    var current_t = Math.round(data.seconds);
    var start_t = Math.round($("#transcript__" + current_t).data('start_time'));

    if (current_t == start_t) {
      $("p.product__text > a.transcript-time").removeClass("highlight_transcript");
      $("#transcript__" + current_t).addClass("highlight_transcript");
    } // ---------------------------------------------------------------------------------------------------


    $('#progress').val(data.seconds);

    if (mzed_enabled.length) {
      var currentTime = data; // if the video is playing the seconds variable is updated every second. This will help update the seconds for the setInterval function call above.

      seconds = currentTime.seconds; // after discussion with scott, decided to change the "watched" criteria to 60% of the video`

      if (currentTime.seconds / currentTime.duration * 100 >= 60) {
        logTimeComplete++;

        if (logTimeComplete === 1) {
          var id = module_id.val();
          var mzed = mzed_enabled.val();
          $.ajax({
            url: '/modules/log_view_count',
            dataType: 'json',
            type: 'POST',
            data: 'id=' + id + '&mzed= ' + mzed,
            success: function success(data) {// console.log(data)
            },
            error: function error(data) {}
          });
        }
      } // mark the lesson as complete if the video is more than 90%  played through


      if (currentTime.seconds / currentTime.duration * 100 >= 90) {
        logVidComplete++;

        if (logVidComplete === 1) {
          var id = module_id.val();
          $.ajax({
            url: '/module/complete',
            dataType: 'json',
            type: 'POST',
            data: 'id=' + id,
            success: function success(data) {// don't do anything
            }
          });
        }
      }
    }
  });
  player.on("ended", function () {
    if (module_id.length) {
      var id = $('#module_id_').val();
      $.ajax({
        url: '/module/complete',
        dataType: 'json',
        type: 'POST',
        data: 'id=' + id,
        success: function success(data) {
          track_video_event(module_id.val(), 'ended', seconds);

          if ($('#next_module').length && !validURL(data)) {
            var autoplay = Cookies.getJSON('autoplay');
            var closeInSeconds = 5,
                displayText = "Next lesson playing in #1 seconds.",
                timer;
            swal({
              title: "Lesson Complete",
              type: "success",
              text: autoplay ? displayText.replace(/#1/, closeInSeconds) : "Click below to advance to the next lesson",
              timer: autoplay ? closeInSeconds * 1000 : "",
              showCancelButton: !0,
              confirmButtonText: "Next Lesson",
              confirmButtonColor: "#5fb7e5",
              customClass: 'next-video-enabled'
            }, function () {
              autoplay ? window.location = $('#next_module').val() : "";
            });

            if (autoplay) {
              timer = setInterval(function () {
                closeInSeconds--;

                if (closeInSeconds === 0) {
                  swal.close();
                  clearInterval(timer);
                }

                $('.sweet-alert > p').text(displayText.replace(/#1/, closeInSeconds));
              }, 1000);
            }
          }

          if (validURL(data)) {
            swal({
              title: "Course Complete",
              type: "success",
              // text: "Check your email to review the course",
              html: !0,
              // timer: 5e3,
              showCancelButton: !0,
              confirmButtonText: "Rate course",
              confirmButtonColor: "#98c65c",
              customClass: 'rate-course-video-enabled'
            }, function () {});
          }

          $('#next_module_rate_course').val(data);
        }
      });
    }
  });
});
$(document).on('click', '.rate-course-video-enabled .sa-confirm-button-container', function (e) {
  e.preventDefault();
  var next = $('#next_module_rate_course').val();
  window.location.href = next;
});
var csrf_token = $('meta[name="csrf-token"]').attr('content');
$.ajaxSetup({
  headers: {
    "X-CSRF-TOKEN": csrf_token
  }
});

function bookmark_ajax(time) {
  // console.log('we made it');
  var module = $('#module_id').val();
  $.ajax({
    url: '/bookmark',
    dataType: 'json',
    type: 'POST',
    data: 'module=' + module + '&time=' + time,
    success: function success(data) {
      var html = '';

      if (data != 'false') {
        $.each(data, function (i) {
          // console.log(time);
          html = html + '<div class="watching__bookmark">' + '<div class="watching__timestamp">' + '<h3 class="product__text product__text--accent watching__timestamp-time">Time: ' + secondsTimeSpanToHMS(data[i].notes_timecode) + ' - ' + data[i].module_name + '</h3>' + '<span class="watching__timestamp-delete delete_bookmark" data-bookmark="' + data[i].notes_id + '" data-module="' + data[i].module_id + '" data-type="' + data[i].bookmark + '" data-time="' + secondsTimeSpanToHMS(data[i].notes_timecode) + '" >Delete X</span>' + '</div>' + '<a data-time="' + data[i].notes_timecode + '" href="#" class="course__cta course__cta--outline course__cta--border-gray course__cta--gray course__cta--alt course__cta--extrasmall play_at_this_point">Go <i class="fa fa-arrow-circle-o-right watching__bookmark-icon" aria-hidden="true"></i></a>' + '</div>';
        });
      }

      $('.bookmarks_reload').html(html);
    },
    error: function error(data) {}
  });
}

function note_ajax(time) {
  var module = $('#module_id').val();
  var text = $('#notes_text').val();

  if (text.length == 0) {
    $('.watching__notes-add').addClass('has-error');
    return false;
  } else {
    $('.watching__notes-add').removeClass('has-error');
  }

  $.ajax({
    url: '/bookmark',
    dataType: 'json',
    type: 'POST',
    data: 'module=' + module + '&time=' + time + '&text=' + text,
    success: function success(data) {
      var html = '';

      if (data != 'false') {
        $.each(data, function (i) {
          html = html + '<div class="watching__note">' + '<div class="watching__timestamp">' + '<h3 class="product__text product__text--accent watching__timestamp-time">Time: ' + secondsTimeSpanToHMS(data[i].notes_timecode) + ' - ' + data[i].module_name + '</h3>' + '<span class="watching__timestamp-delete delete_notes" data-bookmark="' + data[i].notes_id + '" data-module="' + data[i].module_id + '" data-type="' + data[i].bookmark + '" data-time="' + secondsTimeSpanToHMS(data[i].notes_timecode) + '" >Delete X</span>' + '</div>' + '<div class="wathing__note-description">' + '<p class="product__text">' + data[i].text + '</p>' + '</div>' + '<a data-time="' + data[i].notes_timecode + '" href="#" class="course__cta course__cta--outline course__cta--border-gray course__cta--gray course__cta--alt course__cta--extrasmall play_at_this_point">Go <i class="fa fa-arrow-circle-o-right watching__bookmark-icon" aria-hidden="true"></i></a>' + '</div>';
        });
      }

      $('.watching__notes-list').html(html);
      $('#notes_text').val('');
    },
    error: function error(data) {}
  });
}

function track_video_event(module_id, event, seconds) {
  $.ajax({
    url: '/ajax/log_video_event',
    dataType: 'json',
    method: 'POST',
    data: {
      'module_id': module_id,
      'event': event,
      'seconds': seconds
    },
    success: function success(data) {
      console.log(data);
    },
    statusCode: {
      403: function _() {
        player.pause();
        swal({
          title: "Your Session has Expired!",
          text: "Please login to continue",
          type: "warning",
          confirmButtonColor: "#DD6B55",
          closeOnClickOutside: false,
          allowEscapeKey: false
        }, function () {
          window.location.href = '/login';
        });
      },
      419: function _() {
        player.pause();
        swal({
          title: "Your Session has Expired!",
          text: "Please login to continue.",
          type: "warning",
          confirmButtonColor: "#DD6B55",
          closeOnClickOutside: false,
          allowEscapeKey: false
        }, function () {
          window.location.href = '/login';
        });
      }
    }
  });
}

body.on('click', '.add_note', function (e) {
  e.preventDefault();
  player.getCurrentTime().then(function (seconds) {
    note_ajax(seconds);
  })["catch"](function (error) {// an error occurred
  });
});
/**
 * This just triggers play from the watch now button on the mzed pro page
 */

body.on('click', '#watchit', function () {
  player.play();
});
body.on('click', '.play_at_this_point', function (e) {
  e.preventDefault();
  var time = $(this).attr('data-time'); // player.currentTime(time);

  player.setCurrentTime(time).then(function (seconds) {
    // seconds = the actual time that the player seeked to
    player.play();
  })["catch"](function (error) {
    switch (error.name) {
      case 'RangeError':
        // the time was less than 0 or greater than the video’s duration
        break;

      default:
        // some other error occurred
        break;
    }
  });
});
var id = null;
var module = null;
var type = null;
var time = null;
var note = null;
var print_type = null;
body.on('click', '.delete_bookmark', function (e) {
  e.preventDefault();
  id = $(this).attr('data-bookmark');
  module = $(this).attr('data-module');
  type = $(this).attr('data-type');
  time = $(this).attr('data-time');
  note = null;
  print_type = 'Bookmark';
  $('#bookmark_delete_modal').modal('show');
  $('#bookmark_delete_modal .modal-body .action_type').text(print_type);
  $('#bookmark_delete_modal .modal-body .time').text(time);
  $('#bookmark_delete_modal .modal-body .note_modal_content').text(note);
});
$('.delete_bookmark_confirm').click(function (e) {
  if (note == null) {
    $.ajax({
      url: '/delete_bookmark',
      dataType: 'json',
      type: 'POST',
      data: 'id=' + id + '&module=' + module + '&type=' + type,
      success: function success(data) {
        var html = '';

        if (data != 'false') {
          $.each(data, function (i) {
            html = html + '<div class="watching__bookmark">' + '<div class="watching__timestamp">' + '<h3 class="product__text product__text--accent watching__timestamp-time">Time: ' + secondsTimeSpanToHMS(data[i].notes_timecode) + ' - ' + data[i].module_name + '</h3>' + '<span class="watching__timestamp-delete delete_bookmark" data-time="' + secondsTimeSpanToHMS(data[i].notes_timecode) + '"  data-bookmark="' + data[i].notes_id + '" data-module="' + data[i].module_id + '" data-type="' + data[i].bookmark + '">Delete X</span>' + '</div>' + '<a data-time="' + data[i].notes_timecode + '" href="#" class="course__cta course__cta--outline course__cta--border-gray course__cta--gray course__cta--alt course__cta--extrasmall play_at_this_point">Go <i class="fa fa-arrow-circle-o-right watching__bookmark-icon" aria-hidden="true"></i></a>' + '</div>';
          });
        }

        $('.bookmarks_reload').html(html);
      },
      error: function error(data) {}
    });
  } else {
    $.ajax({
      url: '/delete_bookmark',
      dataType: 'json',
      type: 'POST',
      data: 'id=' + id + '&module=' + module + '&type=' + type,
      success: function success(data) {
        var html = '';

        if (data != 'false') {
          $.each(data, function (i) {
            html = html + '<div class="watching__note">' + '<div class="watching__timestamp">' + '<h3 class="product__text product__text--accent watching__timestamp-time">Time: ' + secondsTimeSpanToHMS(data[i].notes_timecode) + ' -' + data[i].module_name + '</h3>' + '<span class="watching__timestamp-delete delete_notes" data-bookmark="' + data[i].notes_id + '" data-module="' + data[i].module_id + '" data-type="' + data[i].bookmark + '" data-time="' + secondsTimeSpanToHMS(data[i].notes_timecode) + '" >Delete X</span>' + '</div>' + '<div class="wathing__note-description">' + '<p class="product__text">' + data[i].text + '</p>' + '</div>' + '<a data-time="' + data[i].notes_timecode + '" href="#" class="course__cta course__cta--outline course__cta--border-gray course__cta--gray course__cta--alt course__cta--extrasmall play_at_this_point">Go <i class="fa fa-arrow-circle-o-right watching__bookmark-icon" aria-hidden="true"></i></a>' + '</div>';
          });
        }

        $('.watching__notes-list').html(html);
      },
      error: function error(data) {}
    });
  }

  $('#bookmark_delete_modal').modal('hide');
});
$('.close_delete_bookmark_confirm').click(function (e) {
  e.preventDefault();
  id = null;
  module = null;
  type = null;
  time = null;
  note = null;
  print_type = null;
  $('#bookmark_delete_modal').modal('hide');
});
body.on('click', '.delete_notes', function (e) {
  e.preventDefault();
  id = $(this).attr('data-bookmark');
  module = $(this).attr('data-module');
  type = $(this).attr('data-type');
  time = $(this).attr('data-time');
  note = $(this).parents('.watching__timestamp').siblings('.wathing__note-description').children('.product__text').text();
  print_type = 'Note';
  $('#bookmark_delete_modal').modal('show');
  $('#bookmark_delete_modal .modal-body .action_type').text(print_type);
  $('#bookmark_delete_modal .modal-body .time').text(time);
  $('#bookmark_delete_modal .modal-body .note_modal_content').text(note);
});
body.on('click', '.video_bookmark', function (e) {
  e.preventDefault();
  player.getCurrentTime().then(function (seconds) {
    // console.log(seconds);
    bookmark_ajax(seconds);
  })["catch"](function (error) {// an error occurred
  });
});

function secondsTimeSpanToHMS(s) {
  var h = Math.floor(s / 3600); //Get whole hours

  s -= h * 3600;
  var m = Math.floor(s / 60); //Get remaining minutes

  s -= m * 60;
  return (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s); //zero padding on minutes and seconds
} // I appended it here because I think it's not a good user experience, if the user will see the toggling of classes


$('.btn-toggle').find('.btn-1').addClass('btn-off');
$('.btn-toggle').find('.btn-0').addClass('btn-on');

if (Cookies.getJSON('autoplay') === true) {
  $('.btn-toggle').find('.btn').toggleClass('btn-off btn-on');
  player.play();
}

$('.btn-toggle').click(function () {
  Cookies.getJSON('autoplay') !== true ? Cookies.set('autoplay', true) : Cookies.set('autoplay', false);
  $(this).find('.btn').toggleClass('btn-off btn-on');
});

/***/ }),

/***/ 1:
/*!********************************************!*\
  !*** multi ./resources/assets/js/video.js ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /app/resources/assets/js/video.js */"./resources/assets/js/video.js");


/***/ })

/******/ });