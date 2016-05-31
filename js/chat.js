// -----------------------------------------------------
// Variables
// -----------------------------------------------------

var lang;
var hasSpeech = false;

// Settings
var weatherApiKey = '0f171838ffe7d226be21b8e88ebc6956';
var googleApiKey = 'AIzaSyAWh9ksj-3PXvML9HMSgQuyNd2euwOH2lw';
var flickrApiKey = '3e5954b4fbe5a56d910af5d2a01a92c5';

// The data variables
var city = 'Auckland'; // Wellington
var country = 'NZ'; // NZ
var lat = "-37.0654751";
var long = "174.4438016";
var weather = [];
var forecast = [];
var skycons; // Weather icon

var lastDay = 0;

//check if browser has speech capabilities
if ('speechSynthesis' in window) {
  hasSpeech = true;

	// Disrupt any current speech
	window.speechSynthesis.cancel();

  // Load Voicebank
  window.speechSynthesis.getVoices();
}

function loadLanguage(language, callback) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
		        lang = JSON.parse(xmlhttp.responseText);

		        document.getElementById("loadingmessage").innerHTML = lang.workingMessage;

		        document.getElementById("messagebox").setAttribute('placeholder', lang.defaultMessage);
		        document.getElementById("temphighlabel").innerHTML = lang.high;
		        document.getElementById("templowlabel").innerHTML = lang.low;
						if(forecast.length > 0)
		        	document.getElementById("dayDay").innerHTML = lang.days[forecast[lastDay]['day']];
						else
		        	document.getElementById("dayDay").innerHTML = lang.days[lastDay];

            callback();
            return;
        }
    };

    xmlhttp.open("GET", "js/lang."+language+".json", true);
    xmlhttp.send();
}

loadLanguage('en', function() {
    sendMessage(getGreeting());
    // Check if browser supports W3C Geolocation API
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    } else {
			locationError();
		}
});

// Location error
function locationError(event) {
		sendMessage(lang.locationerror);
		fetchLocation(city, function(location) {
			updateData(location, function() {
				sendMessage(generateResponse(0));
			});
		});
}

// Get city and country
function locationSuccess(position)
{
    var lat = position.coords.latitude;
    var long = position.coords.longitude;

		fetchLocation(lat, long, function(location) {
			updateData(location, function() {
				sendMessage(generateResponse(0));
			});
		});
}


// -----------------------------------------------------
// Messaging Functions
// -----------------------------------------------------

function getVoice(voiceList, callback) {
    var voices = window.speechSynthesis.getVoices();
    voiceList.some(function(item, index) {
        var voicebank = voices.filter(function(voice) { return voice.name.indexOf(item) > -1; });
        if(voicebank.length > 0) {
            callback(voicebank[0]);
            return true;
        }
    });
}

// When the user sends a message
$('#saySomething input').keyup(function(event) {
    // If not enter, ignore
    if (event.keyCode != 13) return;

		$('#loading').show();

    // Construct the speech box
    var toMessage = $('<div class="speech to"></div>');

    // Insert the user's message and clear the input box
    var query = $('#saySomething input').val();
    toMessage.html(query);
    toMessage.insertBefore($('#endOfMessages'));
    $('#saySomething input').val('');

    if(hasSpeech) {
        //Stop any current speach
        window.speechSynthesis.cancel();
    }

    // Process the query
    processQuery(query);

    // Scroll to the bottom
    var scroll = $('#chat')[0].scrollHeight - $('#chat')[0].clientHeight;
    $("#chat").animate({scrollTop: scroll}, 200);
});

function sendMessage(message)
{

    var fromMessage = $('<div class="speech from"></div>');
    fromMessage.html(message);

    if(hasSpeech) {
        getVoice(lang.systemLang, function(voice) {
            //Create the voice
            var msg = new SpeechSynthesisUtterance();
            msg.voice = voice;
            msg.volume = 1; // 0 to 1
            msg.rate = 1.1; // 0.1 to 10
            msg.pitch = 1; //0 to 2
            msg.text = message;
            msg.lang = msg.voice.lang;

            //Queue speach
            speechSynthesis.speak(msg);
        });
    }

    setTimeout(function() {
        fromMessage.insertBefore($('#endOfMessages'));
        var scroll = $('#chat')[0].scrollHeight - $('#chat')[0].clientHeight;
        $("#chat").animate({scrollTop: scroll}, 200);

				$('#loading').hide();
    }, 1000);

    // Scroll to the bottom
    var scroll = $('#chat')[0].scrollHeight - $('#chat')[0].clientHeight;
    $("#chat").animate({scrollTop: scroll}, 200);

}

// The grand processing function
function processQuery(q) {
	var location = null;
	var day = -1;
	var language = null;

	match(q, lang.locationprefix, function(index) {
		location = q.split(lang.locationprefix[index])[1].trim().split(" ")[0];
	});

	match(q, lang.locationsuffix, function(index) {
		location = q.split(lang.locationsuffix[index])[0].trim().split(" ").pop();
	});

	match(q, [lang.today, lang.tomorrow, lang.dayafter], function(index) {
	    day = index;
	});

	match(q, lang.days, function(index) {
   var today = new Date().getDay();
   if(index < today) {
      index += 7;
   }
   index -= today;

	 day = index;

   match(q, lang.nextweek, function(i) {
      day += 7;
   });
	});

	match(q, ['english', 'français', '日本語', 'nederlands', 'español'], function(index) {
      if(index == 0) language = 'en';
      else if(index == 1) language = 'fr';
      else if(index == 2) language = 'ja';
      else if(index == 3) language = 'nl';
      else if(index == 4) language = 'es';
  });

	if(language !== null) {
		loadLanguage(language, function(event) {

				fetchLocation(city, function(location) {
					updateData(location, function() {
					});
				});

        sendMessage(lang.affirmation);
        sendMessage(getGreeting());
    });
	}

	if(location !== null) {
		if(day < 0) day = lastDay;
		fetchLocation(location, function(event) {
			updateData(event, function() {
				sendMessage(generateResponse(day));
			});
		});
	} else if(day >= 0) {
    sendMessage(generateResponse(day));
	}

	if(location === null && language === null && day < 0) {
    sendMessage(randomItem(lang.unknown));
	}
}

// Generate a welcome greeting depending on the time of day
function getGreeting()
{
    var g = null; //return g

    var now = new Date().getHours();

    var mrn = 0; //Morning
    var day = 11; //Midday
    var aft = 13; //Afternoon
    var eve = 17; //Evening

    if(now >= eve)
        g = lang.greetings[4];
    else if(now >= aft)
        g = lang.greetings[3];
    else if(now >= day)
        g = lang.greetings[2];
    else if(now >= mrn)
        g = lang.greetings[1];
    else
        g = lang.greetings[0];

    return g;
}

//Generate a natural language response
function generateResponse(index) {
		$('#loading').show();

		lastDay = index;

    var vars = lang.responses;

    var day = forecast[index];

    var structure = lang.structure;
    structure = structure.replace('[R0]', randomItem(vars[0])); // Looks like it's
    structure = structure.replace('[WEATHER]', lang.weatherstatus[day['description']]); // cloudy
    structure = structure.replace('[R1]', randomItem(vars[1])); // in
    structure = structure.replace('[CITY]', city); // Wellington

    if(index <= 2) { // If today, tomorrow, or the day after
        structure = structure.replace('[DAY]', lang.daygenerics[index]); // tomorrow
    } else if(index >= 7) { // If next week
        structure = structure.replace('[DAY]', lang.daygenerics[4].replace('[DAY]', lang.days[day['day']])); // next saturday
    } else {
        structure = structure.replace('[DAY]', lang.daygenerics[3].replace('[DAY]', lang.days[day['day']])); // on wednesday
    }

    structure = structure.replace('[R2]', randomItem(vars[2])); // With a high of
    structure = structure.replace('[TEMPMAX]', day['high']); // 12
    structure = structure.replace('[R3]', randomItem(vars[3])); // and a low of
    structure = structure.replace('[TEMPMIN]', day['low']); // 8

    structure = structure.replace('[SUMMARY]', randomItem(lang.summary[day['high'] > 22 ? 0 : day['high'] > 17 ? 1 : 2])); // Good day for the beach

		setForecast(index);

    return structure;
}

function match(query, words, success)
{
    var found = false;

    query = query.toLowerCase();

    words.some(function(item, index) {
        var loc = query.indexOf(item.toLowerCase());
        if(loc > -1) {
            success(index);
            found = true;
            return true;
        }
    });

    if(!found) {
        return false;
    }
}

// Get a random array entry
function randomItem(items)
{
    return items[Math.floor(Math.random()*items.length)];
}

// ----------------------------------------------------------------------
// Get weather data and set it on the page
// ----------------------------------------------------------------------

// Set the forecast data
function setForecast(index) {

	skycons.set("dayIcon", getWeatherIcon(forecast[index]['icon']));
	console.log(forecast[index]['description']);
	if(forecast[index]['description'] < 700)
		document.getElementById('weather_canvas').dataset.frequency = 500;
	else
		document.getElementById('weather_canvas').dataset.frequency = 0;

	var event = document.createEvent('Event');
	event.initEvent('updateWeather', true, true);
	document.dispatchEvent(event);

	// Set the day
	$('#dayDay').html(lang.days[forecast[index]['day']]);

	// Set the high and the low
	$('#dayHigh').html(forecast[index]['high']);
	$('#dayLow').html(forecast[index]['low']);
}

function updateData(event, callback) {

	city = event.city;
	country = event.country;
	lat = event.lat;
	long = event.long;

	updateBackground(event.lat, event.long);

	fetchWeather(event.city, function() {
		callback();
	}, function() {

	});
}

// Get the address from a city name
function fetchLocation() {
	$('#loading').show();

	var url;
	var callback;

	if(arguments.length === 2) {
		url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + arguments[0] + '&language=' + lang.language + '&key=' + googleApiKey;
		callback = arguments[1];
	} else if(arguments.length === 3) {
		var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + arguments[0] + ',' + arguments[1] + '&language=' + lang.language + '&key=' + googleApiKey;
		callback = arguments[2];
	}

	var city = null, country = null, lat = null, long = null;

	$.ajax({
			url: url,
			type: 'GET',
			success: function (response) {
					var addressComponents = response['results'][0]['address_components'];

					addressComponents.forEach(function(item, index) {
							// Get the city
							if (item['types'][0] == 'locality') {
									city = item['long_name'];
							}

							if (item['types'][0] == 'administrative_area_level_1' && city === null) {
									city = item['long_name'];
							}

							// Get the country
							if (item['types'][0] == 'country') {
									country = item['short_name'];
							}
					});

					var coordComponents = response['results'][0]['geometry']['location'];

					lat = coordComponents['lat'];
					long = coordComponents['lng']

					callback({"city": city, "country": country, "lat": lat, "long": long});
			},
			timeout: 5000
	});
}

function fetchWeather(city, success, failure) {
	$('#loading').show();

	url = "//json.ey.nz/api.openweathermap.org/data/2.5/forecast/daily?q=" + city + "&units=metric&cnt=16&appid=" + weatherApiKey;

	forecast = [];

	// Make the call
	$.ajax({
			url: url,
			type: 'GET',
			success: function (response) {
					var items = response['list'];

					items.some(function(item, index) {
							// var newdate = new Date((item['dt'] + (new Date().getTimezoneOffset()*60)) * 1000); //UTC offset

							var newdate = new Date(item['dt']*1000);

							var day = [];
							day['timestamp'] = newdate;
							day['day'] = newdate.getDay();
							day['icon'] = item['weather'][0]['icon'];
							day['description'] = item['weather'][0]['id'];
							day['high'] = Math.round(item['temp']['max']);
							day['low'] = Math.round(item['temp']['min']);

							forecast.push(day);
					});

					success();
			},
			error: function (response) {
					failure();
			},
			timeout: 5000
	});
}

// Update the background image'
function updateBackground(lat, long) {
	$('#loading').show();

	var flickrUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key='+ flickrApiKey + '&lat=' + lat + '&lon=' + long + '&radius=32&per_page=500&format=json&nojsoncallback=1';
	//&geo_context=2

	$.ajax({
			url: flickrUrl,
			type: 'GET',
			success: function (response) {
					var item = Math.round(Math.random() * response.photos.photo.length);

					var photoData = response.photos.photo[item];
					var farm = response.photos.photo[item].farm;
					var server = response.photos.photo[item].server;
					var id = response.photos.photo[item].id;
					var secret = response.photos.photo[item].secret;

					var imageUrl = '//farm' + farm + '.staticflickr.com/' + server + '/' + id + '_' + secret + '_b.jpg';

					$('#background').css('background-image', 'url(' + imageUrl + ')');
			},
			timeout: 5000
	});
}

// Get the name of the weather icon file to load
function getWeatherIcon(iconCode)
{
    // Translate icon code to image
    translate = [];
    translate['01'] = Skycons.CLEAR_DAY; // Clear sky
    translate['02'] = Skycons.CLEAR_DAY; // Few clouds
    translate['03'] = Skycons.PARTLY_CLOUDY_DAY; // Scattered clouds
    translate['04'] = Skycons.PARTLY_CLOUDY_DAY; // Broken clouds
    translate['09'] = Skycons.RAIN; // Shower rain
    translate['10'] = Skycons.RAIN; // Rain
    translate['11'] = Skycons.RAIN; // Thunderstorm
    translate['13'] = Skycons.SNOW; // Snow
    translate['50'] = Skycons.FOG; // Mist

    // Trim the code
    iconCode = iconCode.substring(0, 2);

    return translate[iconCode];
}
