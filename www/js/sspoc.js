$(document).ready(function(){
	let location = window.location.href;
	let urlparts = location.split("#")
	let uri = urlparts[1]
	$(".sspocuri").val(uri)
	$(".btn-sm").click();
})