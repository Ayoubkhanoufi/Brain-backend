const defaultLabels = [
	{
		name: encodeURIComponent("Bug"),
		description: encodeURIComponent("Application Bug"),
		color: encodeURIComponent('#B22222'),
	},
	{
		name: encodeURIComponent("Critical"),
		description: encodeURIComponent("The Issue Is Critical"),
		color: encodeURIComponent('#FF4500')
	},
	{
		name: encodeURIComponent("To Do"),
		description: encodeURIComponent("The Issue Must Be Done Following Board"),
		color: encodeURIComponent('#1E90FF'),
		position: 2
	},
	{
		name: encodeURIComponent("Doing"),
		description: encodeURIComponent("Someone Is Doing The Task"),
		color: encodeURIComponent('#228B22'),
		position: 3
	},
	{
		name: encodeURIComponent("Review"),
		description: encodeURIComponent("The Issue Is In Review State"),
		color: encodeURIComponent('#FF8C00'),
		position: 4
	},
	{
		name: encodeURIComponent("On hold"),
		description: encodeURIComponent("To Not Process The Issue At The Moment"),
		color: encodeURIComponent('#008B8B'),
		position: 1
	},
	{
		name: encodeURIComponent("Need PO"),
		description: encodeURIComponent("The Issue Need A Purchase Order, Do Not Process"),
		color: encodeURIComponent('#9400D3'),
		position: 0
	},
]

const defaultPlugins = [
	{
		name: "wordpress-divi-theme",
		zip: 'https://www.elegantthemes.com/api/api_downloads.php?api_update=1&theme=Divi&api_key=a04e22bd11259892000ef7160191edd098da27c3&username=pulse.digital',
		zipPath: "Divi",
		directory: "wp-content/themes/Divi"
	},
	{
		name: "contact-form-7",
		git: "https://github.com/wp-plugins/contact-form-7.git",
		directory: "wp-content/plugins/Contact-form-7"
	},
	{
		name: "super-progressive-web-apps",
		git: "https://github.com/SuperPWA/Super-Progressive-Web-Apps.git",
		directory: "wp-content/plugins/SuperPWA"
	},
	{
		name: "wp-super-cache",
		git: "https://github.com/Automattic/wp-super-cache.git",
		directory: "wp-content/plugins/WP-super-cache"
	},
	{
		name: "wordpress-seo",
		git: "https://github.com/Yoast/wordpress-seo.git",
		directory: "wp-content/plugins/Yoast"
	},
	{
		name: "gtm4wp",
		git: "https://github.com/duracelltomi/gtm4wp.git",
		directory: "wp-content/plugins/GTM"
	},
	{
		name: "contact-form-cfdb7",
		git: "https://github.com/arshidkv12/contact-form-cfdb7.git",
		directory: "wp-content/plugins/CF7DB"
	},
]

module.exports = {
	labels: defaultLabels,
	plugins: defaultPlugins,
	minimumId: 20000
}
