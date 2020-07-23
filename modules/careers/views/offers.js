const utils = require("../../../lib/utils.js")
const debug = require('debug')('brain:careers:views:offers')
const mongoose = require('mongoose')
const slug = require('slug')

module.exports = (brain, cb) => {

	// offer detail
	brain.careers.router.get("/offer/:id/:slug", (req, res) => {
		brain.lazydb.offers.findOne({ _id: req.params.id, status: "active" })
			.lean()
			.populate("technologies skills")
			.exec((err, item) => {
				const domain = req.headers.host;
				
				const url = req.protocol+'://'+req.headers.host+req.originalUrl;
				
				const meta = {
					"og:url": url,
					"og:type": "website",
					"og:title": 'Pulse.digital - '+item.title,
					"og:description": item.introduction
				}

				if(item.image) {
					meta["og:image"] = req.protocol+'://'+domain+"/careers/files/"+item.image.filename
				}

				const vars = {
					title: item.title+' - Pulse.digital',
					url: url,
					meta: meta,
					item: item,
				}

			
				res.render(__dirname + '/../templates/offers/detail.ejs', vars);
			})
	})


	// default page
	brain.careers.router.use((req, res) => {

		brain.lazydb.offers.find({ status: "active" }).lean().exec((err, data) => {

			const vars = {
				title: "Liste des offers d'emploi - Pulse.digital",
				error: false,
				meta: {},
				rows: []
			}
			for (var a in data) {
				const ptr = data[a];
				ptr.slug = slug(ptr.title)
				vars.rows.push(ptr);
			}
			res.render(__dirname + '/../templates/offers/list.ejs', vars);
		})

	});


	cb()
}
