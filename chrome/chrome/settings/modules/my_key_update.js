/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

let url_params = tool.env.url_params(['account_email', 'longid']);

let url_my_key_page = tool.env.url_create('my_key.htm', url_params);
$('.action_show_public_key').attr('href', url_my_key_page);
let input_private_key = $('.input_private_key');
let prv_headers = tool.crypto.armor.headers('private_key');

window.flowcrypt_storage.keys_get(url_params.account_email, url_params.longid || 'primary').then(keyinfo => {

  if(keyinfo === null) {
    return $('body').text('Key not found. Is FlowCrypt well set up? Contact us at human@flowcrypt.com for help.');
  }

  $('.email').text(url_params.account_email);
  $('.key_words').text(keyinfo.keywords).attr('title', keyinfo.longid);
  input_private_key.attr('placeholder', input_private_key.attr('placeholder') + ' (' + keyinfo.longid + ')');

  $('.action_update_private_key').click(tool.ui.event.prevent(tool.ui.event.double(), () => {
    let updated_key = openpgp.key.readArmored(input_private_key.val()).keys[0];
    let updated_key_encrypted = openpgp.key.readArmored(input_private_key.val()).keys[0];
    let updated_key_passphrase = $('.input_passphrase').val();
    if(typeof updated_key === 'undefined') {
      alert('Private key is not correctly formated. Please insert complete key, including "' + prv_headers.begin + '" and "' + prv_headers.end + '"\n\nEnter the private key you previously used. The corresponding public key is registered with your email, and the private key is needed to confirm this change.\n\nIf you chose to download your backup as a file, you should find it inside that file. If you backed up your key on Gmail, you will find there it by searching your inbox.');
    } else if(updated_key.isPublic()) {
      alert('This was a public key. Please insert a private key instead. It\'s a block of text starting with "' + prv_headers.begin + '"');
    } else if(tool.crypto.key.fingerprint(updated_key) !== tool.crypto.key.fingerprint(keyinfo.public)) {
      alert('This key ' + tool.crypto.key.longid(updated_key) + ' does not match your current key ' + keyinfo.longid);
    } else if(!tool.crypto.key.decrypt(updated_key, updated_key_passphrase).success) {
      alert('The pass phrase does not match.\n\nPlease enter pass phrase of the newly updated key.');
    } else {
      if(updated_key.getEncryptionKeyPacket() !== null) {
        store_updated_key_and_passphrase(updated_key_encrypted, updated_key_passphrase);
      } else { // cannot get a valid encryption key packet
        if((updated_key.verifyPrimaryKey() === openpgp.enums.keyStatus.no_self_cert) || tool.crypto.key.expired_for_encryption(updated_key)) { // known issues - key can be fixed
          render_prv_compatibility_fix_ui('.compatibility_fix_container', updated_key_encrypted, updated_key_passphrase, url_my_key_page, (fixed_encrypted_prv) => {
            store_updated_key_and_passphrase(fixed_encrypted_prv, updated_key_passphrase);
          });
        } else {
          alert('Key update: This looks like a valid key but it cannot be used for encryption. Please write me at human@flowcrypt.com to see why is that. I\'m VERY prompt to respond.');
          window.location = url_my_key_page;
        }
      }
    }
  }));

  function store_updated_key_and_passphrase(updated_prv, updated_prv_passphrase) {
    window.flowcrypt_storage.passphrase_get(url_params.account_email, keyinfo.longid, true).then(stored_passphrase => {
      Promise.all([ // update key and pass phrase
        window.flowcrypt_storage.keys_add(url_params.account_email, updated_prv.armor()),
        window.flowcrypt_storage.passphrase_save('local', url_params.account_email, keyinfo.longid, stored_passphrase !== null ? updated_prv_passphrase : undefined),
        window.flowcrypt_storage.passphrase_save('session', url_params.account_email, keyinfo.longid, stored_passphrase !== null ? undefined : updated_prv_passphrase),
      ]).then(() => {
        alert('Public and private key updated.\n\nPlease send updated PUBLIC key to human@flowcrypt.com to update Attester records.');
        window.location = url_my_key_page;
      });
    });

  }

});