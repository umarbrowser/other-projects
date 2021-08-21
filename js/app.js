'use strict';

$(document).ready( () => { 
	const registerServiceWorker = new MainController();	
});

class MainController {

  constructor () {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.register('./sw.js').then( sw => {
	  if (!navigator.serviceWorker.controller) {
        return;
      }
      if (sw.waiting) {
        MainController.updateReady(sw.waiting);
        return;
      }
      if (sw.installing) {
        MainController.trackInstalling(sw.installing);
        return;
      }
      sw.addEventListener('updatefound', () => {
        MainController.trackInstalling(sw.installing);
      });
	  let refresh;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refresh) return;
        window.location.reload();
        refresh = true;
      });
    });

	fetchAllCurrencies();
  }
  static trackInstalling(worker) {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        MainController.updateReady(worker);
      }
    });
  }

  static updateReady(worker) {
    MainController.showAlert('New version available');
	$("#refresh").click( () => worker.postMessage({ action: 'skipWaiting' }) );	
  }
  static showAlert(message) {
	$("#alert").css('display','block');
    $("#alert-message").innerHTML(message);
	$("#dismiss").click( () => $("#alert").fadeOut() );
  }
}
if (!window.indexedDB) {
    console.log("Your browser doesn't support IndexedDB");
}
const openDatabase = () => {
	const DB_NAME 	= 'pyc0d3r';
	const database 	= indexedDB.open(DB_NAME, 1);
	database.onerror = event => {
		console.log('error opening web');
		return false;
	};
	database.onupgradeneeded = event => {
	  	let upgradeDB = event.target.result;
	  	let objectStore = upgradeDB.createObjectStore("currencies");
	};
	return database;
}

const saveToDatabase = data => {
	const db = openDatabase();

	db.onsuccess = event => {

		const query = event.target.result;
		const currency = query.transaction("currencies").objectStore("currencies").get(data.symbol);
	  	currency.onsuccess = event => {
	  		const dbData = event.target.result;
	  		const store  = query.transaction("currencies", "readwrite").objectStore("currencies");

	  		if(!dbData){
				store.add(data, data.symbol);
	  		}else{
				store.put(data, data.symbol);
	  		};
	  	}
	}
}

const fetchFromDatabase = (symbol, amount) => {
	const db = openDatabase();

	db.onsuccess = event => {

		document.getElementById('convert-btn').addEventListener('click', () => {
			$(".results").html("");
        });
		
		const query = event.target.result;

		const currency = query.transaction("currencies").objectStore("currencies").get(symbol);

	  	currency.onsuccess =  event => {
	  		const data = event.target.result;
	  		if(data == null){
	  			$(".error_msg").append(`
					<div class="output-results">
		                <span class="text-danger">
		                	You are currently offline... please check your internet connectivity and try again.
		                </span>
					</div>
				`);

				setTimeout( e => $(".error_msg").html(""), 3000);
				return;
	  		}
			let frElement = document.getElementById('from-currency');
			let toElement = document.getElementById('to-currency');
			let frText = frElement.options[frElement.selectedIndex].innerHTML;			
			let toText = toElement.options[toElement.selectedIndex].innerHTML;
			
			$(".results").append(`
				<div class="output-results">	       
					<b>${amount} </b> <b> ${frText}</b><br> = <br><b>${(amount * data.value).toFixed(2)} ${toText}</b>
				</div>
			`);
	  	}
	}
}

const fetchAllCurrencies = e => {
	$.get('https://api.exchangeratesapi.io/v1/', data => {
		if(!data) console.log("Could not fetch any data");
		const resultdata = objectToArray(data.results);
		for(let val of resultdata){
			$("#from-currency").append(`
				<option value="${val.id}">${val.id} (${val.currencyName})</option>
			`);
			$("#to-currency").append(`
				<option value="${val.id}">${val.id} (${val.currencyName})</option>
			`);
		}
	})
	.fail( () => console.log( "Could not show any currencies Data" ) );
}

const convertCurrency = () => {
	let fromCurrency 	= $("#from-currency").val();
	let toCurrency 		= $("#to-currency").val();
	let amount	= $("#convert-amount").val();

	document.getElementById('convert-btn').addEventListener('click', () => {
			$(".output-results").html('');
    });

	if(fromCurrency == toCurrency){
		$(".error_msg").html(`
			<div class="output-results">
				<span class="text-danger">
					Error you are wrong select again, Tip: the are the same currency
				</span>
			</div>
		`);		

		return false;
	}
	let body  = `${fromCurrency}_${toCurrency}`;
	let query = {
		q: body
	};
	$.get('https://free.currencyconverterapi.com/api/v5/convert', query, data => {
		const pairs = objectToArray(data.results);
		let frElement = document.getElementById('from-currency');
		let toElement = document.getElementById('to-currency');
		let frText = frElement.options[frElement.selectedIndex].innerHTML;
		let toText = toElement.options[toElement.selectedIndex].innerHTML;
		$.each(pairs, (index, val) => {
			$(".results").append(`
				<div class="output-results">	       
					<b>${amount} </b> <b> ${frText}</b><br> = <br><b>${(amount * val.val).toFixed(2)} ${toText}</b>
				</div>
			`);
			let object = {
				symbol: body,
				value: val.val
			};
			saveToDatabase(object);
		});
	}).fail((err) => {
		fetchFromDatabase(body, amount);
	});
	return false;
}
const objectToArray = objects => {
	const results = Object.keys(objects).map(i => objects[i]);
	return results;
}
