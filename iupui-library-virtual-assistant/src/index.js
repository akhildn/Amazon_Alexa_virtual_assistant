var Alexa = require('alexa-sdk');

var APP_ID = "enter you app id here";
var appLogLevel = "INFO"
var context;
var speechString = {
	"en-US": {
		"translation": {
			"NEW_UNHANDLED": "Sorry I didn't get that...."
			 		+ "You can ask questions limited to library hours, and finding books.", 
			"APP_OWNER_NAME": "Akhil Nayabu",
			"APP_NAME": "IUPUI Library Assistant",
			"SEARCH_UNHANDLED": "Invalid search...",
			"STOP_MESSAGE": "Thank you for visting.... Good Bye!!!",
			"CANCEL_MESSAGE": "Good Bye!!!"
		}
	}
}

/*
	various log levels
*/
var LOG_LEVEL = {
	"INFO": 1,
	"DEBUG": 2
};

exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event, context);
	alexa.appId = APP_ID;
	alexa.resources = speechString;
	alexa.registerHandlers(newSessionHandlers);
	alexa.execute();
};

var newSessionHandlers = {
	"LaunchRequest": function() {
		this.emitWithState("StartAsk", true); // TODO: What is emitWithState
	}, 
	"AMAZON.StartOverIntent": function() {
		logger(appLogLevel, "INFO", "AMAZON.StartOverIntent", JSON.stringify(this.event.request));
		clearState();	
		this.emitWithState("StartAsk", false);
	}, 
	"AMAZON.RepeatIntent": function () {
		logger(appLogLevel, "INFO", "ASK_AMAZON.RepeatIntent", JSON.stringify(this.event.request));
        this.emit(":ask", this.attributes["speechOutput"], this.attributes["repromptText"]);
    },
	 "AMAZON.HelpIntent": function() {
	 	logger(appLogLevel, "INFO", "ASK_AMAZON.HelpIntent", JSON.stringify(this.event.request));
        speechOutput = "You can ask questions limited to library hours and finding books.";
		repromptText = "You can ask questions limited to library hours and finding books.";
		this.handler.state = undefined;

		if(this.attributes['previousContext'] === 'BOOK_SEARCH_CONFIRM') {
			var prev_speech_text = this.attributes['speechOutput'];
			speechOutput = prev_speech_text + " If the information is correct say Yes else say No to start new search.";
			this.emit(":ask", speechOutput, speechOutput);			
		}
		if(this.attributes['previousContext'] === 'AUTHOR') {
			var prev_speech_text = this.attributes['speechOutput'];
			speechOutput = "You can say the author name by saying like Author name is John Smith.";
			this.emit(":ask", speechOutput, speechOutput);			
		}

		this.emit(":ask", speechOutput, speechOutput);
        
    },
	"Unhandled": function() {
		logger(appLogLevel, "DEBUG", "ASK_Unhandled", JSON.stringify(this.event.request));
		var speechOutput = "Sorry I didn't get what you said.";

		this.emit(":ask", speechOutput, speechOutput);
	}, 
	"AMAZON.StopIntent": function () {
		clearState();
        var speechOutput = this.t("STOP_MESSAGE");
        this.emit(":tell", speechOutput, speechOutput);
    },
    "AMAZON.CancelIntent": function () {
    	clearState();
        this.emit(":tell", this.t("CANCEL_MESSAGE"));
    },
	"SessionEndedRequest": function() {
		logger(appLogLevel, "DEBUG", "SessionEndedRequest", JSON.stringify(this.event.request));
	}, 
	"StartAsk": function(newSearch) {
		logger(appLogLevel, "INFO", "StartAsk", JSON.stringify(this.event.request));
		logger(appLogLevel, "INFO", "StartAsk", "newSearch = " + newSearch);
		
		clearState();
		var speechOutput =  "";
		var repromptText = "";
		if(newSearch === true) {
			speechOutput = "Hi, My name is Jinx, your IUPUI virtual Library Assistant..... You can ask questions "
			+ "limited to library hours, and finding books.";
			repromptText = "You can ask questions limited to library hours, and finding books.";
		} else {
			speechOutput = "You can ask for library hours," 
							+ " OR say find a book.... to search for a book,  " ;
			repromptText = speechOutput;
		}

		// Setting the previousContext so that we can know what was the previous asked question
		// while processing the next request.
		this.attributes['previousContext'] = 'WELCOME';

		// Setting speechOutput and repromptText in session context
		// So that these messages can be replayed when user asks for reprompt / repeat. 
		this.attributes['speechOutput'] = speechOutput;
		this.attributes['repromptText'] = repromptText;

		// Send output from our service to Alexa voice service.
		this.emit(":ask", speechOutput, repromptText, this.t("APP_NAME"), repromptText);
	},
	"LibraryHoursIntent": function() {
		logger(appLogLevel, "INFO", "LibraryHoursIntent", JSON.stringify(this.event.request));
		var day = this.event.request.intent.slots.date.value;
		var date = new Date(day);
		
		var hrsObj = getLibraryHoursByDay(date.getDay());

		var speechOutput = buildLibHrsByDayResponse(hrsObj);
		
		this.attributes['previousContext'] = 'CONTINUE';
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = speechOutput;

		this.emit(":ask", speechOutput, speechOutput);

	}, 
	"LibraryHoursSemesterIntent": function() {
		logger(appLogLevel, "INFO", "LibraryHoursSemesterIntent", JSON.stringify(this.event.request));
		var semester = this.event.request.intent.slots.semester.value
		if(semester === undefined 
			|| semester.toUpperCase() === 'CURRENT'
			|| semester.toUpperCase() === 'THIS') {
			semester = "Spring"
		}
		var hrsObj = getLibraryHoursBySemester(semester);

		var speechOutput = buildLibraryHrsBySemesterResponse(hrsObj);

		this.attributes['previousContext'] = 'CONTINUE';
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = speechOutput;

		this.emit(":ask", speechOutput, speechOutput);
	},
	"FindABookByNameIntent": function() {
		logger(appLogLevel, "INFO", "FindABookByNameIntent", JSON.stringify(this.event.request));

		if( (this.attributes['previousContext'] === 'BOOK_SEARCH_CONFIRM' 
				|| this.attributes['previousContext'] === 'CONTINUE'
			)
			&& this.event.request.intent.slots.bookName.value.toUpperCase() === 'YES') {
			this.emitWithState("AMAZON.YesIntent");
		}

		if(this.attributes['previousContext'] === 'AUTHOR') {
			this.emitWithState("AMAZON.HelpIntent")
		}

		var bookName = this.event.request.intent.slots.bookName.value
		if(bookName === undefined) {
			bookName = "No Book"
		}
		var speechOutput = "Who is the author of this book ?";
		var repromptText = "Who is the author of this book ?";
		this.attributes['previousContext'] = 'AUTHOR';
		this.attributes['bookSearchRequest'] = {
			bookName: bookName
		};
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = speechOutput;

		this.emit(":ask", speechOutput, repromptText);
	},
	"FindABookByAuthorIntent": function() {
		logger(appLogLevel, "INFO", "FindABookByAuthorIntent", JSON.stringify(this.event.request));
		if(this.attributes['bookSearchRequest'] === undefined 
			|| this.attributes['bookSearchRequest'].bookName === undefined) {
			this.emitWithState("FindABookIntent");
		}

		if(this.attributes['previousContext'] === 'BOOK_SEARCH_CONFIRM') {
			this.emitWithState("AMAZON.HelpIntent");
		}
		
		var bookName = this.attributes['bookSearchRequest'].bookName;
		var author = this.event.request.intent.slots.author.value;

		var speechOutput = "I heard Book Name  as " + bookName + " and author as "+ author +". Is that correct ?";
		var repromptText = "Do you want to search for the book " + bookName + " written by "+ author +" ?";
		this.attributes['previousContext'] = 'BOOK_SEARCH_CONFIRM';
		this.attributes['bookSearchRequest'].author = author;
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = repromptText;	

		this.emit(":ask", speechOutput, repromptText);

	},
	"FindABookByNameAuthorIntent": function() {
		logger(appLogLevel, "INFO", "FindABookByNameAuthorIntent", JSON.stringify(this.event.request));
		var bookName = this.event.request.intent.slots.bookName.value;
		var author = this.event.request.intent.slots.author.value;
		if(bookName === undefined) {
			bookName = this.attributes['bookSearchRequest'].bookName;
		}
		if(this.attributes['bookSearchRequest'] === undefined) {
			this.attributes['bookSearchRequest'] = {
				bookName: bookName
			};
		}
		var speechOutput = "I heard book name as  " + bookName + " and author as "+ author +". Is that correct ?";
		var repromptText = "Do you want to search for the book " + bookName + " written by "+ author +" ?";
		this.attributes['previousContext'] = 'BOOK_SEARCH_CONFIRM';
		this.attributes['bookSearchRequest'].author = author;
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = repromptText;

		this.emit(":ask", speechOutput, repromptText);

	},
	"AMAZON.YesIntent": function() {
		logger(appLogLevel, "INFO", "AMAZON.YesIntent", JSON.stringify(this.event.request));
		if(this.attributes['previousContext'] === 'BOOK_SEARCH_CONFIRM'
			&& this.attributes['bookSearchRequest'].author !== undefined
			&& this.attributes['bookSearchRequest'].bookName !== undefined) {
			this.emitWithState("BookSearchResult");
		}

		if(this.attributes["previousContext"] === "CONTINUE") {
			this.emitWithState("StartAsk", false);
		}
	},
	"AMAZON.NoIntent": function() {
		logger(appLogLevel, "INFO", "AMAZON.NoIntent", JSON.stringify(this.event.request));
		if(this.attributes['previousContext'] === 'BOOK_SEARCH_CONFIRM') {
			this.attributes['bookSearchRequest'] = {};
			this.emitWithState("FindABookIntent");
		}

		if(this.attributes["previousContext"] === "CONTINUE") {
			this.emitWithState("AMAZON.StopIntent");
		}
	},
	"FindABookIntent": function() {
		logger(appLogLevel, "INFO", "BookSearch", JSON.stringify(this.event.request));

		var speechOutput = "Let's begin the book search..... What is the book name you are trying to find ?";
		var repromptText = "What is the book name you are trying to find ?";

		this.emit(":ask", speechOutput, repromptText);

	},
	"BookSearchResult": function() {
		logger(appLogLevel, "INFO", "BookSearchResult", JSON.stringify(this.event.request));
		var bookName = this.attributes['bookSearchRequest'].bookName;
		var author = this.attributes['bookSearchRequest'].author;

		var resBook = searchBookDB(bookName, author);
		var speechOutput = buildBookResultResponse(resBook);
		/*var speechOutput = bookName + " written by " + author 
							+ " is located Indianapolis campus library, 2nd floor row 42. Is there any thing I can help you with ?";
		*/

		speechOutput += " Is there any thing I can help you with ?";
		this.attributes["speechOutput"] = speechOutput;
		this.attributes["repromptText"] = speechOutput;
		this.attributes["previousContext"] = "CONTINUE";
		this.emit(":ask", speechOutput, speechOutput);

	}

};


//--------------------------------------------------
/*
	HELPER FUNCTIONS:
*/

var logger = function(appLogLevel, logLevel, intentName, logMessage) {
	if(LOG_LEVEL[appLogLevel] <= LOG_LEVEL[logLevel]) {
		console.log(logLevel + ": " + intentName + ":" + logMessage);
	}
};

var buildLibHrsByDayResponse = function(hrsObj) {
	var speechOutput = "Library hours for " 
						+ hrsObj.day 
						+ " are "
						+ hrsObj.time
						+".... Is there any thing I can help you with ?";

	return speechOutput;

};

var buildLibraryHrsBySemesterResponse = function(hrsObj) {
	var speechOutput = "Library hours for " 
						+ hrsObj.semester  
						+ " are "
						+ hrsObj.time
						+".... Is there any thing I can help you with ?";
	return speechOutput;
};

var buildBookResultResponse = function(bookObj) {

	var speechOutput = "";
	if(bookObj === undefined) {
		speechOutput = "No results found for you search";
		return speechOutput;
	}

	// If the book is present in IUPUI
	if(bookObj.isInIUPUI) {
		speechOutput = bookObj.name 
						+ " written by "
						+ bookObj.authorFirstName
						+ " "
						+ bookObj.authorLastName
						+ " is available in "
						+ bookObj.location[0].campus
						+ " library "
						+ "<say-as interpret-as=\"ordinal\">"
						+ bookObj.location[0].floor
						+ "</say-as> floor , row number "
						+ bookObj.location[0].row
						+ "......"
						;
		return speechOutput;
	}

	if(!bookObj.isInIUPUI) {
		var campusString = "";

		for(var index = 0; index < bookObj.location.length; index++) {
			campusString += bookObj.location[index].campus + ",";
		}

		// When book not in IUPUI and not in any other campus.
		if(campusString === "") {
			speechOutput = "No results found for you search";
			return speechOutput;
		}

		speechOutput = bookObj.name 
						+ " written by "
						+ bookObj.authorFirstName
						+ " "
						+ bookObj.authorLastName
						+ " is available in following campuses: "
						+ campusString
						+ ". You can request for inter library loan at the front desk."
		return speechOutput;
	}

	return speechOutput;
};

var initializeBooks = function() {

	var books = {

		"books": [
			{
				"name": "Introduction to Java Programming : 2nd Edition",
				"authorFirstName": "John",
				"authorLastName": "Davis",
				"isInIUPUI": true,
				"location" : [
					{
						"campus": "Indianapolis",
						"floor": 2,
						"row": 24
					}, 
					{
						"campus": "South East"
					}
				]
			}, 
			{
				"name": "Programming Interviews exposed",
				"authorFirstName": "John",
				"authorLastName": "Mongan",
				"isInIUPUI": false,
				"location" : [ 
					{
						"campus": "South East"
					}, 
					{
						"campus": "Bloomington"
					}
				]
			}
		]

	};

	return books;

};

var initializeLibHoursByDay = function() {

	var hours = {

		"hours": [
			{
				"day" : "MONDAY",
				"dayCd": 1,
				"time": "8:00 AM - 5:00 PM"
			},
			{
				"day" : "TUESDAY",
				"dayCd": 2,
				"time": "8:00 AM - 5:00 PM"
			},
			{
				"day" : "WEDNESDAY",
				"dayCd": 3,
				"time": "8:00 AM - 5:00 PM"
			},
			{
				"day" : "THURSDAY",
				"dayCd": 4,
				"time": "8:00 AM - 5:00 PM"
			},
			{
				"day" : "FRIDAY",
				"dayCd": 5,
				"time": "8:00 AM - 5:00 PM"
			},
			{
				"day" : "SATURDAY",
				"dayCd": 6,
				"time": "8:00 AM - 1:00 PM"
			},
			{
				"day" : "SUNDAY",
				"dayCd": 0,
				"time": "8:00 AM - 2:00 PM"
			}
		]
	};

	return hours;
};

var initializeLibHoursBySemester = function() {

	var hours = {
		"hours": [
			{
				"semester": "SPRING",
				"time": "Monday to Friday 8:00 AM - 5:00 PM, Saturday 8:00 AM - 2:00 PM, Sunday 8:00 AM - 1:00 PM"
			},
			{
				"semester": "SUMMER",
				"time": "Monday to Friday 8:00 AM - 5:00 PM, Saturday 8:00 AM - 2:00 PM, Sunday 8:00 AM - 1:00 PM"
			},
			{
				"semester": "FALL",
				"time": "Monday to Friday 8:00 AM - 5:00 PM, Saturday 8:00 AM - 2:00 PM, Sunday 8:00 AM - 1:00 PM"
			},
			{
				"semester": "WINTER",
				"time": "Monday to Friday 8:00 AM - 5:00 PM, Saturday 8:00 AM - 2:00 PM, Sunday 8:00 AM - 1:00 PM"
			}
		]
	};

	return hours;

};

var getLibraryHoursByDay = function(dayofWeek) {

	var hrs = initializeLibHoursByDay();

	var matchIndex = -1;
	for(var index = 0; index < hrs.hours.length; index++) {
		if(dayofWeek === hrs.hours[index].dayCd)
			matchIndex = index;
	}

	if(matchIndex >=0 ) {
		return hrs.hours[matchIndex];
	} else {
		return undefined;
	}
};

var getLibraryHoursBySemester = function(semester) {
	logger(appLogLevel, "INFO", "getLibraryHoursBySemester", semester);
	var hrs = initializeLibHoursBySemester();

	var matchIndex = -1;
	for(var index = 0; index < hrs.hours.length; index++) {
		if(semester.toUpperCase() === hrs.hours[index].semester)
			matchIndex = index;
	}

	if(matchIndex >=0 ) {
		logger(appLogLevel, "INFO", "getLibraryHoursBySemester", JSON.stringify(hrs.hours[matchIndex]));
		return hrs.hours[matchIndex];
	} else {
		return undefined;
	}
};

var searchBookDB = function(bookName, author) {
	logger(appLogLevel, "INFO", "searchBookDB", bookName + " : " + author);
	var bookResp = initializeBooks();

	var booksArray = bookResp.books;

	var matchIndex = -1;
	for(var index = 0; index < booksArray.length; index++) {
		if( (bookName.toUpperCase().includes(booksArray[index].name.toUpperCase())
				|| booksArray[index].name.toUpperCase().includes(bookName.toUpperCase())

			)
			&& (author.toUpperCase().includes(booksArray[index].authorFirstName.toUpperCase())
					|| author.toUpperCase().includes(booksArray[index].authorLastName.toUpperCase())
				)
			) {
			matchIndex = index;
		}
	}

	if(matchIndex >=0 ) {
		logger(appLogLevel, "INFO", "searchBookDB", JSON.stringify(booksArray[matchIndex]));
		return booksArray[matchIndex];
	} else {
		return undefined;
	}

};

var clearState = function() {
	this.attributes = undefined;
	//this.handler.state = APP_STATES.START;
};
