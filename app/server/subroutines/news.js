const moment = require('moment');

const HttpsAgent = require('agentkeepalive').HttpsAgent;
var httpsAgent = new HttpsAgent({
  maxSockets: 45,
  maxFreeSockets: 2,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 35000, // free socket keepalive for 30 seconds
});

var blogPostsUrl = process.env.BLOG_URL || "https://nikolayshamberg.ghost.io/ghost/api/v3/content/{ENTRYPOINT}/?key=c7dd8a2a3d7cee9002ddbdd616"


var request = require('request')

var nodeHtmlParser = require ('node-html-parser')

module.exports = function (app) {
    
    app.get(['/news/list/allNews/:page/', '/news/list/allNews/'], function(req,res) {
		ghostListGetter(req,res)
	})

	app.get(['/recommendation/:regionCode/', '/recommendation/'], function(req,res) {
		if (req.params.regionCode && req.params.regionCode != "general") {
			if (isNaN(req.params.regionCode)) {
				res.status(400).json({
					code: 400,
					status: 'error',
					error: 'bad-data'
				})
			}
			else {
				let regionCode = parseInt(req.params.regionCode)
				if (regionCode > 92 || regionCode < 1) {
					res.status(400).json({
						code: 400,
						status: 'error',
						error: 'bad-data'
					})
				}
				else {
					ghostPageGetter(req,res, regionCode)
				}
			}
		}
		else {
			ghostPageGetter(req,res, 'general')
		}
	})

}

function ghostPageGetter(req,res,regionCode) {
	var p0 = new Promise(function (resolve, reject) {
		var unencodedUrl = blogPostsUrl.replace("{ENTRYPOINT}", `pages/slug/recommendation-${regionCode}`)
		//'&filter=tags:'+tags+"&page="+page+"&order=published_at desc"+"&include=authors,tags"+"&limit=" + limitOnPage
		
		var url = encodeURI(unencodedUrl);
		
		request({
			method: "GET",
			json: true,
			//forever: true,
			agent: httpsAgent,
			uri: url,
			body: req.body
		}, function (error, response, body) {
			if (error || response.statusCode != 200) {
				var resObj = {
					code: 500,
					status: 'error',
					error: error || "post-not-found"
				}
				resolve(resObj)
			// Print the error if one occurred
			}
			else {
				var excerpt = body.pages[0].custom_excerpt || body.pages[0].excerpt;
				excerpt = excerptFormer(excerpt)
				
				var html = body.pages[0].html;
				var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
				while (SCRIPT_REGEX.test(html)) {
					html = html.replace(SCRIPT_REGEX, "");
				}
				
				
				var postObj = {
					id: body.pages[0].id,
					uuid: body.pages[0].uuid,
					title: body.pages[0].title,
					excerpt: excerpt,
					html: htmlFormer(html)
				}
				
				
				
				var resObj = {
					code: 200,
					status: "ok",
					data: postObj
				}
				
				resolve(resObj)
				
			}
		
		
		})
	})
	p0
		.then(function (result) {
			//console.log(result)
			res.status(result.code).json(result)
		})
}


function ghostListGetter (req,res) {

	goToPromise()
	
	function goToPromise() {
	
		var p0 = new Promise(
   			function (resolve, reject) {
						
						if (req.params.page && Number.isNaN(page) == false) {
							var page = req.params.page;
						}		
						else {
							var page = 1;
						}
						
						var limitOnPage = req.query.limitOnPage

						if (!limitOnPage) {
							limitOnPage = 5
						}
						else if (limitOnPage > 30) {
							limitOnPage = 30
						}
						limitOnPage = limitOnPage.toString();
					
						var unencodedUrl = blogPostsUrl.replace("{ENTRYPOINT}", "posts") + '&filter=tags:covid19'+"&page="+page+"&order=published_at desc"+"&include=authors,tags"+"&limit=" + limitOnPage
						var url = encodeURI(unencodedUrl);
                        console.log(url)
                        request({
							method: "GET",
							json: true,
							//forever: true,
							agent: httpsAgent,
							uri: url,
							body: req.body
						}, function (error, response, body) {
                            if (error || response.statusCode != 200) {
								console.log(body)
								var resObj = {
									code: 500,
									status: 'error',
									error: error || "post-not-found"
								}
								resolve(resObj)
							// Print the error if one occurred
							}
							else {
								
								let posts = [];
								let k = 0;
								do {
									if (k > 0 && k != body.posts.length || (k == 0 && body.posts[0])) {
										var z = 0
										var resolvedTags = []
										var tagsDetailed = []
										
										do {
											if (z == 0 && !body.posts[k].tags[0]) {
												z++
											}
											else {
												resolvedTags.push(body.posts[k].tags[z].name)
												let tagData = {
													name: body.posts[k].tags[z].name,
													
                                                }
												tagData.internalName = body.posts[k].tags[z].slug
												z++
											}
										}
										while (z < body.posts[k].tags.length);
										//body.posts[k].tags.includes('vip')
										var excerpt = body.posts[k].custom_excerpt || body.posts[k].excerpt;
										if (excerpt) {
											
											excerpt = excerptFormer(excerpt)
											
										}
										else if (!excerpt) {
											excerpt = " "
										}
										
										
										
										
										
										var postObj = {
											id: body.posts[k].id,
											uuid: body.posts[k].uuid,
											tags: resolvedTags,
											tagsDetailed: tagsDetailed,
											title: body.posts[k].title,
											html: htmlFormer(body.posts[k].html),
											//feature_image: body.posts[k].feature_image,
											excerpt: excerpt,
											created_at: moment(body.posts[k].created_at).valueOf(),
											updated_at: moment(body.posts[k].updated_at).valueOf(),
											published_at: moment(body.posts[k].published_at).valueOf(),
											authors: body.posts[k].authors,
											primary_author: body.posts[k].primary_author,
											prohibited: false			
										}	
										
										
										if (body.posts[k].feature_image) {
											postObj.feature_image = body.posts[k].feature_image
										}
										
										postObj = checkIfNew(postObj, req.session)
										
										posts.push(postObj)
									}
									if (k < body.posts.length) {
										k++
									}
								}
								while (k < body.posts.length)
								var data = {
									posts: posts,
									meta: body.meta
								}
								var resObj = {
									code: 200,
									status: "ok",
									data: data
								}
								resolve(resObj)
							}
						});
					
            })
            	
			p0
				.then(function (result) {
   			    	res.status(result.code).json(result)
   				})
	}
}



function excerptFormer(excerpt) {
	excerpt = excerpt.replace(/[\n\r]+/g, ' ')
	//excerpt = '<html><head></head><body><p style="font-size:1.15rem">'+excerpt+"</p></body></html>"
	excerpt = excerpt.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').trim();
	if (excerpt == "") {
		excerpt = " ";
	}
	return excerpt
}

function checkIfNew(postObj, session)  {
    return postObj
}

//function checkIfNew(postObj, session)  {
//	if (!session.user.newsRead) {
//		session.user.newsRead = [];
//	}
//	if (session.user.newsRead.includes(postObj.id)) {
//		postObj.isNew = false;
//	}
//	else if (moment(postObj.published_at).isBefore(moment(session.dateCreation))) {
//		postObj.isNew = false;
//	}
//	else {
//		
//		postObj.isNew = true;
//	}
//	return postObj;
//}


function htmlFormer(html, lang, ios, featureImage) {
	if (lang == "ru") {
		var viewOtherSourceText = "<h4 class='otherResource'>Посмотреть на другом ресурсе:</h4>"
	}
	else if (lang == "de") {
		var viewOtherSourceText = "<h4 class='otherResource'>Um eine andere Quelle zu betrachten</h4>"
	}
	
	const cheerio = require('cheerio')

	// Trust me, it has to be this way
	html = html.replace(/  +/g, ' ');
	html = html.replace(/  +/g, ' ');
	html = html.replace(/  +/g, ' ');
	html = html.replace(/  +/g, ' ');
	html = html.replace(new RegExp('<!--kg-card-begin: image-->', 'gim'), '')
	html = html.replace(new RegExp('<!--kg-card-end: image-->', 'gim'), '')
	html = html.replace(new RegExp('<figure class="kg-card kg-image-card">', 'gim'), '')
	html = html.replace(new RegExp('</figure>', 'gim'), '')
	html = html.replace('\\', '')
	html = html.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  	var decode = function(str) {
		return str.replace(/&#(\d+);/g, function(match, dec) {
			return String.fromCharCode(dec);
		});
	}
	
	var newsArray = []
	var stop = false;
	
	var nodeHtmlParser = require ('node-html-parser')
	var Entities = require("html-entities").AllHtmlEntities;
	const entities = new Entities();
	var root = nodeHtmlParser.parse(html);

	var i;
	for (i = 0; i < Object.keys(root.childNodes).length; i++) {
		if (root.childNodes[i].tagName=="img") {
			var img = {
				img: root.childNodes[i].attributes.src,
			}
			newsArray.push(img);
		}

		else {
			//var html = "html: " + root.childNodes[i].outerHTML;
			var arrLength = newsArray.length
			// newsArray[arrLength-1].slice(0,5) == "html:"
			if (newsArray && newsArray[arrLength-1] && typeof newsArray[arrLength-1] == "string") {
				
				newsArray[arrLength-1] = newsArray[arrLength-1] + root.childNodes[i].outerHTML;
			}
			else {
				var cHTML = root.childNodes[i].outerHTML
				newsArray.push(cHTML);
			}
		}
	}
	var i1;
	var newsArray2 = []
	for (i1=0; i1<newsArray.length; i1++) {
		
		if (typeof newsArray[i1] == "string") {
            var contents = newsArray[i1];
            var css
            if (process.env.CSS_URL || process.env.BASE_URL) {
			    var cssURL = process.env.CSS_URL || process.env.BASE_URL + '/static/styleNews.css'
                css = '<link rel="stylesheet" type="text/css" href="' + cssURL + '">';
            }
            else {
                css = ''
            }
			var html = "<html><head>" + css + "</head><body>"+ contents + "</body></html>"
			var $ = cheerio.load(html)
			$('a').each(function(i) {
			    if($(this).attr("href") == $(this).html())
			    {
			    	let el = $(viewOtherSourceText).insertBefore($(this))
			    }
			});
			var link = null
			if (ios && $('.kg-bookmark-card').length) {
				link = {
					url: $('.kg-bookmark-container').attr('href'),
					img: $('.kg-bookmark-thumbnail img').attr('src') || process.env.BASE_URL + "/static/roedlLogo.png",
					description: $('.kg-bookmark-description').text(),
					publisher: $('.kg-bookmark-publisher').text(),
				}
				if (!link.img.endsWith('.jpg') && !link.img.endsWith('.jpeg') && !link.img.endsWith('.png')) {
					//link.img = process.env.BASE_URL + "/static/roedlLogo.png"
					link.img = featureImage
				}
				console.log(link)
				$('.kg-bookmark-card').remove()
			}
			else if (ios == false) {
				let imgUrl = $('.kg-bookmark-thumbnail img').attr('src')
				if (imgUrl && (!imgUrl.endsWith('.jpg') && !imgUrl.endsWith('.jpeg') && !imgUrl.endsWith('.png'))) {
					//imgUrl = process.env.BASE_URL + "/static/roedlLogo.png"
					imgUrl = featureImage
					$('.kg-bookmark-thumbnail img').attr('src', imgUrl)
				}
			}
			$("<p class='emptyLine'> </p").insertBefore($('.kg-bookmark-publisher'))
			$(viewOtherSourceText).insertBefore($('.kg-bookmark-card'))
			$('.kg-bookmark-container').prepend( $('.kg-bookmark-thumbnail') )
			//$('.kg-bookmark-thumbnail').remove()
			$(".kg-bookmark-icon").after("&nbsp;");
			contents = entities.decode($.html())
			
			newsArray2.push({
				html: contents.replace("> <", "><").replace('<span class="kg-bookmark-publisher">avatar</span>', ''),
			})
			if (link) {
				newsArray2.push({
					link: link
				})
			}
		}
		else {
			newsArray2.push(newsArray[i1])
			continue
		}
	}

	return newsArray2
}