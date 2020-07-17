require 'rails_helper'

describe 'AAL3 authentication required in an SAML context' do
  include SamlAuthHelper

  describe 'SAML ServiceProvider requesting AAL3 authentication' do
    pending 'Pending actual support of multiple auth contexts in SAML'

    context 'user does not have aal3 auth configured' do
      it 'sends user to set up AAL3 auth'
    end

    context 'user has aal3 auth configured' do
      it 'sends user to authenticate with AAL3 auth'
    end
  end

  describe 'SAML ServiceProvider configured to require AAL3 authentication' do
    context 'user does not have aal3 auth configured' do
      it 'sends user to set up AAL3 auth' do
        user = user_with_2fa

        visit aal3_sp1_authnrequest
        sign_in_live_with_2fa(user)

        expect(current_url).to eq(two_factor_options_url)
        expect(page).to have_content(t('two_factor_authentication.two_factor_aal3_choice'))
        expect(page).to have_xpath("//img[@alt='important alert icon']")
      end
    end

    context 'user has aal3 auth configured' do
      it 'sends user to authenticate with AAL3 auth' do
        user = user_with_aal3_2fa

        visit aal3_sp1_authnrequest
        sign_in_live_with_aal2_2fa_only(user)

        expect(current_url).to eq(login_two_factor_webauthn_url)
      end
    end
  end
end