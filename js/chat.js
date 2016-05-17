// Load Voicebank
window.speechSynthesis.getVoices();

var lang;

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

loadLanguage('en', function(e) {
    lang = e;
    // Check if browser supports W3C Geolocation API
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError);
    }
});

            
// -----------------------------------------------------
// Messaging Functions
// -----------------------------------------------------

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
    
    
    //Stop any current speach
    window.speechSynthesis.cancel();
    
    //Create the voice
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    msg.voice = voices.filter(function(voice) { return voice.name == lang.userLang; })[0];
    msg.volume = 1; // 0 to 1
    msg.rate = 1.3; // 0.1 to 10
    msg.pitch = 1; //0 to 2
    msg.text = query;
    msg.lang = msg.voice.lang;

    //Speak
    speechSynthesis.speak(msg);

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
    
    //Create the voice        
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    msg.voice = voices.filter(function(voice) { return voice.name == lang.systemLang; })[0];;
    msg.volume = 1; // 0 to 1
    msg.rate = 1.2; // 0.1 to 10
    msg.pitch = 1; //0 to 2
    msg.text = message;
    msg.lang = msg.voice.lang;

    //Speak
    speechSynthesis.speak(msg);
    
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
    q = q.split(' ');
    q.forEach(function(item, i) {
        q[i] = item.replace(/[^a-z]/g, "");
    });
    q.join(" ");

    if (match(q, ['tomorrow'])) {
        sendMessage(generateResponse(forecast[1]));
    } else if (match(q, lang.days)) {
        forecast.forEach(function(item, i) {
            if (q.indexOf(item['day'].toLowerCase()) > -1) {
                sendMessage(generateResponse(forecast[i]));
                return;
            }
        });
    } else {
        // Don't know
        sendMessage(randomItem(lang.unknown));
    }
}

function match(query, words)
{
    var contains = false;
    query.forEach(function(q, qI) {
        words.forEach(function(w, qI) {
            if (q.toLowerCase() == w.toLowerCase()) {
                contains = true;
                return;
            }
        });
    });

    return contains;
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
    url = "http://api.openweathermap.org/data/2.5/forecast/daily?q=" + city + "&appid=" + weatherApiKey;

    // Make the call
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response) {
            var items = response['list'];

            items.forEach(function(item, index) {
                // If in the past, ignore it
                var m = moment(item['dt']*1000).utc();                            
                if (m.format('X') < moment().format('X')) return;

                var day = [];
                day['moment'] = moment(item['dt']*1000).utc();
                day['day'] = lang.days[moment(item['dt']*1000).utc().day()];
                day['icon'] = item['weather'][0]['icon'];
                day['description'] = item['weather'][0]['description']
                day['high'] = Math.round(item['temp']['max'] - 273.15);
                day['low'] = Math.round(item['temp']['min'] - 273.15);

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
            var item = Math.round(Math.random() * 60);
            var photoData = response.photos.photo[item];
            var farm = response.photos.photo[item].farm;
            var server = response.photos.photo[item].server;
            var id = response.photos.photo[item].id;
            var secret = response.photos.photo[item].secret;

            var imageUrl = 'http://farm' + farm + '.staticflickr.com/' + server + '/' + id + '_' + secret + '_b.jpg';

            $('#background').css('background-image', 'url(' + imageUrl + ')');
        },
        timeout: 5000
    });
}

// Location error
function locationError()
{
    // Show a failure dialogue
    $('#popupWeather').show();
    $('#popupBlack').show();
}

function generateResponse(day)
{
    var vars = lang.responses;

    var status = [];
    status.push(randomItem(vars[0])); // Looks like it's
    status.push(day['description']); // cloudy
    status.push(randomItem(vars[1])); // in
    status.push(city); // Wellington.

    var index = forecast.indexOf(day);
    status.push((index == 0 ? lang.today : index == 1 ? lang.tomorrow : 'on ' + day['day']) + '.');
    status.push(randomItem(vars[2])); // With a high of
    status.push(day['high']);
    status.push(randomItem(vars[3])); // and a low of
    status.push(day['low']+'.');

    if (day['high'] > 22) {
        status.push(randomItem(lang.summary[0])); // Good day for the beach.
    } else if (day['high'] > 17) {
        status.push(randomItem(lang.summary[1])); // Could be warmer.
    } else {
        status.push(randomItem(lang.summary[2])); // Layer up!
    }

    status = status.join(' ');

    return status;
}

// Get a random array entry
function randomItem(items)
{
    return items[Math.floor(Math.random()*items.length)];
}
            
// Generate a welcome greeting depending on the time of day
function getGreeting()
{
    var m = moment();
    var g = null; //return g

    if(!m || !m.isValid()) { return; } //if we can't find a valid or filled moment, we return.

    var now = parseFloat(m.format("HH"));

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