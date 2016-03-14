'use strict';

function compose_render_pubkey_result(email, pubkey_data) {
  if(pubkey_data !== null) {
    $("#input_to").removeClass("email_plain");
    $("#input_to").addClass("email_secure");
    $("#send_btn i").removeClass("fa-unlock");
    $("#send_btn i").removeClass("fa-spinner");
    $("#send_btn i").removeClass("fa-pulse");
    $("#send_btn i").addClass("fa-lock");
    $("#send_btn").addClass("button_secure");
    $("#send_btn span").text("Send PGP Encrypted");
    $("#send_btn_note").text('');
  } else {
    $("#input_to").removeClass("email_secure");
    $("#input_to").addClass("email_plain");
    $("#send_btn i").removeClass("fa-lock");
    $("#send_btn i").removeClass("fa-spinner");
    $("#send_btn i").removeClass("fa-pulse");
    $("#send_btn i").addClass("fa-unlock");
    $("#send_btn").removeClass("button_secure");
    $("#send_btn span").text("Send");
    $("#send_btn_note").text('They don\'t have encryption set up. Invite them to get CryptUP');
  }
}

function encrypt(pubkey_texts, data, armor, callback) {
  var pubkeys = [];
  $.each(pubkey_texts, function(i, pubkey_text) {
    pubkeys = pubkeys.concat(openpgp.key.readArmored(pubkey_text).keys); // read public key
  });
  var encrypt_options = {
    // data: str_to_uint8(text),
    data: data,
    publicKeys: pubkeys,
    armor: armor,
  };
  openpgp.encrypt(encrypt_options).then(callback, callback);
}

function fetch_pubkeys(account_email, recipient, callback) {
  var pubkeys = [];
  if($('#send_btn.button_secure').length > 0) {
    get_pubkey(recipient, function(pubkey_recipient) {
      if(pubkey_recipient === null) {
        alert('error: key is undefined although should exist');
        return;
      }
      pubkeys.push(restricted_account_storage_get(account_email, 'master_public_key'));
      pubkeys.push(pubkey_recipient);
      callback(pubkeys);
    });
  } else {
    callback(null);
  }
}

function compose_encrypt_and_send(account_email, to, subject, plaintext, send_email_callback) {
  var btn_text = $('#send_btn').text();
  $('#send_btn').html('Loading ' + get_spinner());
  fetch_pubkeys(account_email, to, function(armored_pubkeys) {
    if(to == '') {
      $('#send_btn').text(btn_text);
      alert('Please add receiving email address.');
      return;
    } else if((plaintext != '' || window.confirm('Send empty message?')) && (subject != '' || window.confirm('Send without a subject?'))) {
      //todo - tailor for replying w/o subject
      if(armored_pubkeys) {
        $('#send_btn').html('Encrypting ' + get_spinner());;
      }
      try {
        encrypt_and_collect_attachments(armored_pubkeys, function(attachments) {
          if((attachments || []).length) {
            var sending = 'Uploading attachments ' + get_spinner();
          } else {
            var sending = 'Sending ' + get_spinner();
          }
          if(armored_pubkeys) {
            encrypt(armored_pubkeys, plaintext, true, function(encrypted) {
              $('#send_btn').html(sending);
              send_email_callback(true, encrypted.data, attachments);
            });
          } else {
            $('#send_btn').html(sending);
            send_email_callback(false, plaintext, attachments);
          }
        });
      } catch(err) {
        $('#send_btn').text(btn_text);
        alert(err);
      }
    } else {
      $('#send_btn').text(btn_text);
    }
  });
}

function compose_render_email_secure_or_insecure() {
  var email = $(this).val();
  if(is_email_valid(email)) {
    $("#send_btn i").addClass("fa-spinner");
    $("#send_btn i").addClass("fa-pulse");
    $("#send_btn span").text("");
    $("#send_btn_note").text("Checking email address");
    get_pubkey(email, function(pubkey) {
      compose_render_pubkey_result(email, pubkey);
    });
  } else {
    compose_render_email_neutral();
  }
}

function compose_render_email_neutral() {
  $("#input_to").removeClass("email_secure");
  $("#input_to").removeClass("email_plain");
  $("#send_btn").removeClass("button_secure");
  $("#send_btn i").removeClass("fa-lock");
  $("#send_btn i").removeClass("fa-spinner");
  $("#send_btn i").removeClass("fa-pulse");
  $("#send_btn i").addClass("fa-unlock");
  $("#send_btn span").text("Send");
  $("#send_btn_note").text('');
}

function convert_html_tags_to_newlines(text) {
  // todo: approximation. Does not handle <div><br></div> well which contenteditable fields tend to create
  return text.replace(/<[bB][rR] ?\/?>/g, '\n').replace(/<[dD][iI][vV][^>]*>/g, '\n').replace(/<\/[dD][iI][vV][^>]*>/g, '').trim();
}