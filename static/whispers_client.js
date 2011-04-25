


Whispers = (function() {
	var me = {};
	var client_info;
	var socket;

	me.Init = function(gameid) {
		$('#error').click(function() {
			$(this).hide('fast');
		});
		/*
			User Input
		*/
		var namechange = function() {
			if (this.value) {
				socket.send({'setName': this.value});
			}
		}
		$('#name_pick').change(namechange).keyup(function(evt) {
			if (evt.which === 13) {
				namechange.call(this);
			}
		});
		$('#begin').click(function() {
			if (client_info.admin === true) {
				socket.send({'begin' : true});
			}
		});
		$('#starter_form').submit(function() {
			if (this.entry.value) {
				socket.send({'describe': this.entry.value});
			}
			return false;
		});
		$('#description_form').submit(function() {
			if (this.entry.value) {
				socket.send({'describe': this.entry.value});
			}
			return false;
		});	
		

		$('#uploadform').submit(function(evt) {
			evt.preventDefault();
			var f = this.File.files[0];
			var r = new FileReader();
			r.onload = function(data) {
				var url = data.target.result;
				if (url) {
					socket.send({'upload': {
						data: url,
						name: f.name
					}});
				}
			}
			r.readAsDataURL(f);
			return false;
		});		
		/*
			Network events
		*/
		socket = new io.Socket(null);
		socket.connect();
		socket.on('connect', function() {
			socket.send({'join': {
				id: gameid
			}});
		});
		socket.on('message', function(messages) { 
			
			//Process network messages
			for (var msgname in messages) {
				var data = messages[msgname];
				var effspd = 'slow';
				console.log(msgname, data);
				switch (msgname) {
					case 'error': 
						$('#error > h3').html("Error: "+data.msg);
						$('#stack').html('<pre>'+data.stack+'</pre>');
						$('#error').show('fast');
						break;
					case 'acceptJoin':
						if (data.admin) {
							$('#begin').toggle();
						}
						client_info = data;
						break;
					case 'clientList':
						var list = document.getElementById('player_list');
						list.innerHTML = "";
						data.forEach(function(c) {
							var li = document.createElement("li");
							list.appendChild(li);
							li.innerHTML = htmlEntities(c.name);
							li.innerText = c.name;
							if (c.id === client_info.id) $(li).addClass('me');
							if (c.admin === true) $(li).addClass('admin')
						});
						break;
					case 'start':
						$('.gamebox').hide(effspd);
						if (client_info.admin === true) {
							$('#endgame_box').show(effspd);
						}
						break;
					case 'initialScene':
						$('.gamebox').hide(effspd);
						$('#write_starter').show(effspd);
						$('.destination').text(data.destination.name);
						break;
					case 'drawThis':
						$('.gamebox').hide(effspd);
						$('#upload_your_pic').show(effspd);
						$('.sender').text(data.sender.name);
						$('#description').text(data.description);
						$('.destination').text(data.destination.name);
						
						break;
					case 'describeThis':
						$('.gamebox').hide(effspd);
						$('#write_description').show(effspd);
						$('.destination').text(data.destination.name);
						$('.sender').text(data.sender.name);
						$('#uploadedimage').attr('src', data.image.url).attr('alt', data.image.name);
						$('#uploadedimagelink').attr('href', data.image.url).attr('title', data.image.name);
						break;
					case 'wait':
						$('.gamebox').hide(effspd);
						if (data.currplayer.id !== client_info.id) {
							$('#waiting').show(effspd);
							$('#waitmessage').html(function() {
								if (data.action === 'start') {
									return sprintf("<em>%s</em> is currently creating an initial scene for <em>%s</em> to paint.",data.currplayer.name, data.nextplayer.name);
								}
								if (data.action === 'paint') {
									return sprintf("<em>%s</em> is currently painting an image for <em>%s</em> to match <em>%s</em>'s description", data.currplayer.name, data.nextplayer.name, data.prevplayer.name);
								}
								if (data.action === 'describe') {
									return sprintf("<em>%s</em> is currently writing a description of <em>%s</em>'s image for <em>%s</em>", data.currplayer.name, data.prevplayer.name, data.nextplayer.name);
								}
							});
						}
						break;
					default:
						console.error("unknown message "+msgname);
				}
			}
		});
	};
	
	return me;
}());
