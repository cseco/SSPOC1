$('.upload-btn').on('click', function (){
    $('#upload-input').click();
    $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
});

$('#upload-input').on('change', function(){

  var files = $(this).get(0).files;

  if (files.length > 0){
    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();

    // loop through all the selected files and add them to the formData object
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      console.log(file.name)
      // add the files to formData object for the data payload
      formData.append('uploads[]', file, file.name);
      formData.append('uploads[]', file, file.name);
    }

    $.ajax({
      url: '/spoc/uploaddwg',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
          console.log(data);
          console.log('upload successful!\n' + data);
      },
      error: function() {
        console.log("error uploading files.....")
      }
    });

  }
});
