megaBrain.sync(list, () => {
	var buffer = ";";

	for(var year=2019; year<=2019; year++) {
		for(var month=1; month<=12; month++) {
			buffer += ";"+year+"/"+month
		}
	}

	buffer += "\n"
	for(var a in data.users) {
		const user = data.users[a];

		buffer += user.name+";"+user.username;

		for(var year=2019; year<=2019; year++) {
			const pyear = user.spent[year];

			for(var month=1; month<=12; month++) {
				var pmonth;
				if(user.spent[year]) pmonth =  user.spent[year][month];
				if(!pmonth) buffer += ";0";
				else {
					buffer += ";"+Math.ceil(pmonth/60);
				}
			}

		}

		buffer += "\n"

	}

	console.log(buffer);
})
