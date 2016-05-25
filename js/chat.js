var lang;
var hasSpeech = false;

//check if browser has speech capabilities
if ('speechSynthesis' in window) {
  hasSpeech = true;
    
  // Load Voicebank
  window.speechSynthesis.getVoices();
}

function loadLanguage(lang, callback) {
    var xmlhttp = new XMLHttpRequest();
    var url = "myTutorials.txt";

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            callback(JSON.parse(xmlhttp.responseText));
            return;
        }
    };
    xmlhttp.open("GET", "js/lang."+lang+".json", true);
    xmlhttp.send();
}

loadLanguage('en', function(event) {
    lang = event;
    
    document.getElementById("messagebox").setAttribute('placeholder', lang.defaultMessage);
    document.getElementById("temphighlabel").innerHTML = lang.high;
    document.getElementById("templowlabel").innerHTML = lang.low;
    
    // Check if browser supports W3C Geolocation API
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    }
});

            
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

    //     getVoice(lang.userLang, function(voice) {
    //         //Create the voice        
    //         var msg = new SpeechSynthesisUtterance();
    //         msg.voice = voice;
    //         msg.volume = 1; // 0 to 1
    //         msg.rate = 1.3; // 0.1 to 10
    //         msg.pitch = 1; //0 to 2
    //         msg.text = query;
    //         msg.lang = msg.voice.lang;

    //         //Speak
    //         speechSynthesis.speak(msg);
    //     });
    
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
    }, 1000);

    // Scroll to the bottom
    var scroll = $('#chat')[0].scrollHeight - $('#chat')[0].clientHeight;
    $("#chat").animate({scrollTop: scroll}, 200);
}

// The grand processing function
function processQuery(q)
{
    // Clean the query
    q = q.toLowerCase();
    // q = q.split(' ');
    // q.forEach(function(item, i) {
    //     q[i] = item.replace(/[^a-z]/g, "");
    // });
    // q.join(" ");
    
    var days = lang.days.slice(0);
    var n = new Date().getDay();
    for(var i = 0; i < n+2; ++i) {
        days.push(days.shift());
    }
    
    match(q, [lang.today].concat([lang.tomorrow].concat(days)), function(index) {
        index %= 7;
        sendMessage(generateResponse(forecast[index]));
        return true;
    }, function() {
        match(q, ['english', 'français', '日本語'], function(index) {
            var newlang = 'en';
            if(index == 0) newlang = 'en';
            else if(index == 1) newlang = 'fr';
            else if(index == 2) newlang = 'ja';
            
            loadLanguage(newlang, function(event) {
                lang = event;
                
                document.getElementById("messagebox").setAttribute('placeholder', lang.defaultMessage);
                document.getElementById("temphighlabel").innerHTML = lang.high;
                document.getElementById("templowlabel").innerHTML = lang.low;
                
                sendMessage(lang.affirmation);
                setStatus();
            });
        }, function() {
            sendMessage(randomItem(lang.unknown));
            return false;
        });
    });
}

function match(query, words, success, failure)
{
    var found = false;
    words.some(function(item, index) {
        var loc = query.toLowerCase().indexOf(item.toLowerCase());
        if(loc > -1) {
            success(index);
            found = true;
            return true;
        }
    });
    if(!found) {
        failure();
        return false;
    }
}

// ----------------------------------------------------------------------
// Get weather data and set it on the page
// ----------------------------------------------------------------------

// Settings
var weatherApiKey = '0f171838ffe7d226be21b8e88ebc6956';
var googleApiKey = 'AIzaSyAWh9ksj-3PXvML9HMSgQuyNd2euwOH2lw';
var flickrApiKey = '3e5954b4fbe5a56d910af5d2a01a92c5';

// The data variables
var city = 'Auckland'; // Wellington
var country = 'NZ'; // NZ
var weather = [];
var forecast = [];
var skycons; // Weather icon

// Updates current weather
function setStatus()
{
    sendMessage(getGreeting());
    sendMessage(generateResponse(forecast[0]));
}

// Set the forecast data
function setForecast()
{
    // For each day...
    forecast.forEach(function(item, index) {
        if (i > 4) return;
        var i = index + 1;

        // Change the icon
        skycons.set("dayIcon", getWeatherIcon(forecast[index]['icon']));

        // Set the day
        $('#day'+i+'Day').html(forecast[index]['day']);

        // Set the high and the low
        $('#day'+i+'High').html(forecast[index]['high']);
        $('#day'+i+'Low').html(forecast[index]['low']);
    });
}

function getForecast()
{
    // Make the URL
    url = "//json.ey.nz/api.openweathermap.org/data/2.5/forecast/daily?q=" + city + "&units=metric&cnt=16&appid=" + weatherApiKey;
    // Make the call
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response) {
            var items = response['list'];
            
            var today = new Date();

            items.some(function(item, index) {
                // If in the past, ignore it                
                
                var newdate = new Date(item['dt']*1000);
                newdate.setTime(newdate.getTime() + newdate.getTimezoneOffset()*60*1000 );

                if(newdate < today) {
                    return;
                }
                
                var day = [];
                day['day'] = newdate.getDay();
                day['icon'] = item['weather'][0]['icon'];
                day['description'] = item['weather'][0]['id'];
                day['high'] = Math.round(item['temp']['max']);
                day['low'] = Math.round(item['temp']['min']);

                forecast.push(day);
            });

            // Set the forecast data and status
            setForecast();
            setStatus();

            // Run again in an hour
            setTimeout(getForecast, 3600000);

            // Hide the failure dialogue
            $('#popupWeather').hide();
            $('#popupBlack').hide();

            // Hide the loading dialogue
            $('#popupLoading').hide();
        },
        error: function (response) {
            // Run again in a minute
            setTimeout(getForecast, 60000);

            // Show a failure dialogue
            $('#popupWeather').show();
            $('#popupBlack').show();
        },
        timeout: 5000
    });
}

// Get city and country
function locationSuccess(position)
{
    var lat = position.coords.latitude;
    var long = position.coords.longitude;

    var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + long + '&key=' + googleApiKey;

    // Get the address
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response) {
            var components = response['results'][0]['address_components'];

            components.forEach(function(item, index) {
                // Get the city
                if (item['types'][0] == 'administrative_area_level_1') {
                    city = item['long_name'];
                }

                // Get the country
                if (item['types'][0] == 'country') {
                    country = item['short_name'];
                }
            });
            // Update the weather data
            getForecast();

            // Hide the failure dialogue
            $('#popupWeather').hide();
            $('#popupBlack').hide();
        },
        error: function (response) {
            // Run again in a minute
            setTimeout(getWeather, 60000);

            // Show a failure dialogue
            $('#popupWeather').show();
            $('#popupBlack').show();
        },
        timeout: 5000
    });

    // Update the background image'
    var flickrUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key='+ flickrApiKey + '&lat=' + lat + '&lon=' + long + '&radius=32&geo_context=2&per_page=500&format=json&nojsoncallback=1';
    $.ajax({
        url: flickrUrl,
        type: 'GET',
        success: function (response) {
            var item = Math.round(Math.random() * response.photos.total);
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

// Location error
function locationError(e)
{
    console.log('location error' + e);
    // Show a failure dialogue
    $('#popupWeather').show();
    $('#popupBlack').show();
}

function generateResponse(day)
{
    var vars = lang.responses;
    
    var status = [];
    var index = forecast.indexOf(day);
    
    var structure = lang.structure;
    structure = structure.replace('[R0]', randomItem(vars[0])); // Looks like it's
    structure = structure.replace('[WEATHER]', lang.weatherstatus[day['description']]); // cloudy
    structure = structure.replace('[R1]', randomItem(vars[1])); // in
    structure = structure.replace('[CITY]', city); // Wellington

    structure = structure.replace('[DAY]', (index <= 2 ? lang.daygenerics[index] : lang.daygenerics[3].replace('[DAY]', lang.days[day['day']]))); // tomorrow
    
    structure = structure.replace('[R2]', randomItem(vars[2])); // With a high of
    structure = structure.replace('[TEMPMAX]', day['high']); // 12
    structure = structure.replace('[R3]', randomItem(vars[3])); // and a low of
    structure = structure.replace('[TEMPMIN]', day['low']); // 8
    
    structure = structure.replace('[SUMMARY]', randomItem(lang.summary[day['high'] > 22 ? 0 : day['high'] > 17 ? 1 : 2])); // Good day for the beach

    return structure;
    
    // console.log(structure);

    // status.push(randomItem(vars[0])); // Looks like it's
    // status.push(day['description']); // cloudy
    // status.push(randomItem(vars[1])); // in
    // status.push(city); // Wellington.

    // status.push((index == 0 ? lang.today : index == 1 ? lang.tomorrow : 'on ' + day['day']) + '.');
    // status.push(randomItem(vars[2])); // With a high of
    // status.push(day['high']);
    // status.push(randomItem(vars[3])); // and a low of
    // status.push(day['low']+'.');

    // if (day['high'] > 22) {
    //     status.push(randomItem(lang.summary[0])); // Good day for the beach.
    // } else if (day['high'] > 17) {
    //     status.push(randomItem(lang.summary[1])); // Could be warmer.
    // } else {
    //     status.push(randomItem(lang.summary[2])); // Layer up!
    // }

    // status = status.join(' ');

    // return status;
}

// Get a random array entry
function randomItem(items)
{
    return items[Math.floor(Math.random()*items.length)];
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