/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

tool.ui.event.protect();

let url_params = tool.env.url_params(['account_email', 'armored_pubkey', 'parent_tab_id', 'minimized', 'compact', 'frame_id']);
// minimized means I have to click to see details. Compact means the details take up very little space.

let pubkeys = openpgp.key.readArmored(url_params.armored_pubkey).keys;

render();

function send_resize_message() {
  tool.browser.message.send(url_params.parent_tab_id, 'set_css', {
    selector: 'iframe#' + url_params.frame_id,
    css: { height: $('#pgp_block').height() + (url_params.compact ? 10 : 30) },
  });
}

function set_button_text() {
  if(pubkeys.length > 1) {
    $('.action_add_contact').text('import ' + pubkeys.length + ' public keys');
  } else {
    window.flowcrypt_storage.db_contact_get(null, $('.input_email').val(), function (contact) {
      $('.action_add_contact').text(contact && contact.has_pgp ? 'update contact' : 'add to contacts');
    });
  }
}

function render() {
  $('.pubkey').text(url_params.armored_pubkey);
  if(url_params.compact) {
    $('.hide_if_compact').remove();
    $('body').css({border: 'none', padding: 0});
    $('.line').removeClass('line');
  }
  $('.line.fingerprints, .line.add_contact').css('display', url_params.minimized ? 'none' : 'block');
  if(pubkeys.length === 1) {
    $('.line.fingerprints .fingerprint').text(tool.crypto.key.fingerprint(pubkeys[0], 'spaced'));
    $('.line.fingerprints .keywords').text(mnemonic(tool.crypto.key.longid(pubkeys[0])));
  } else {
    $('.line.fingerprints').css({display: 'none'});
  }
}

if(typeof pubkeys[0] !== 'undefined') {
  if (pubkeys[0].getEncryptionKeyPacket() === null && pubkeys[0].getSigningKeyPacket() === null) {
    // todo - people may still get errors if this is signing only key and they try to encrypt, but I'm leaving it here in case they just want to verify signatures
    $('.line.add_contact').addClass('bad').html('This public key looks correctly formatted, but cannot be used for encryption. Please write me at human@flowcrypt.com so that I can see if there is a way to fix it.');
    $('.line.fingerprints').css({ display: 'none', visibility: 'hidden' });
  } else {
    if(pubkeys.length === 1) {
      $('.input_email').val(tool.str.parse_email(pubkeys[0].users[0].userId.userid).email);
      $('.email').text(tool.str.parse_email(pubkeys[0].users[0].userId.userid).email);
    } else {
      $('.email').text('more than one person');
      $('.input_email').css({display: 'none'});
      $('.add_contact').append(' for ' + pubkeys.map(pubkey => tool.str.parse_email(pubkey.users[0].userId.userid).email).filter(e => tool.str.is_email_valid(e)).join(', '));
    }
    set_button_text();
  }
} else {
  let fixed = url_params.armored_pubkey;
  while(/\n> |\n>\n/.test(fixed)) {
    fixed = fixed.replace(/\n> /g, '\n').replace(/\n>\n/g, '\n\n');
  }
  if(fixed !== url_params.armored_pubkey) { // try to re-render it after un-quoting, (minimized because it is probably their own pubkey quoted by the other guy)
    window.location = tool.env.url_create('pgp_pubkey.htm', { armored_pubkey: fixed, minimized: true, account_email: url_params.account_email, parent_tab_id: url_params.parent_tab_id, frame_id: url_params.frame_id });
  } else {
    $('.line.add_contact').addClass('bad').html('This public key is invalid or has unknown format.');
    $('.line.fingerprints').css({ display: 'none', visibility: 'hidden' });
  }
}
send_resize_message();

$('.action_add_contact').click(tool.ui.event.prevent(tool.ui.event.double(), function (self) {
  if(pubkeys.length > 1) {
    let contacts = [];
    $.each(pubkeys, (i, pubkey) => {
      let email_address = tool.str.parse_email(pubkey.users[0].userId.userid).email;
      if(tool.str.is_email_valid(email_address)) {
        contacts.push(window.flowcrypt_storage.db_contact_object(email_address, null, 'pgp', pubkey.armor(), null, false, Date.now()));
      }
    });
    window.flowcrypt_storage.db_contact_save(null, contacts, function () {
      $(self).replaceWith('<span class="good">added public keys</span>');
      $('.input_email').remove();
    });
  } else {
    if(tool.str.is_email_valid($('.input_email').val())) {
      window.flowcrypt_storage.db_contact_save(null, window.flowcrypt_storage.db_contact_object($('.input_email').val(), null, 'pgp', pubkeys[0].armor(), null, false, Date.now()), function () {
        $(self).replaceWith('<span class="good">' + $('.input_email').val() + ' added</span>');
        $('.input_email').remove();
      });
    } else {
      alert('This email is invalid, please check for typos. Not added.');
      $('.input_email').focus();
    }
  }
}));

$('.input_email').keyup(function () {
  set_button_text();
});

$('.action_show_full').click(function () {
  $(this).css('display', 'none');
  $('pre.pubkey, .line.fingerprints, .line.add_contact').css('display', 'block');
  send_resize_message();
});

send_resize_message();
