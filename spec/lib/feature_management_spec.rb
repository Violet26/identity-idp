require 'rails_helper'

describe 'FeatureManagement', type: :feature do
  describe '#prefill_otp_codes?' do
    context 'when SMS sending is disabled' do
      before { allow(FeatureManagement).to receive(:telephony_test_adapter?).and_return(true) }

      it 'returns true in development mode' do
        allow(Rails.env).to receive(:development?).and_return(true)

        expect(FeatureManagement.prefill_otp_codes?).to eq(true)
      end

      it 'returns false in non-development mode' do
        allow(Rails.env).to receive(:development?).and_return(false)

        expect(FeatureManagement.prefill_otp_codes?).to eq(false)
      end
    end

    context 'in production servers' do
      before do
        allow(FeatureManagement).to receive(:telephony_test_adapter?).and_return(true)
        allow(Rails.env).to receive(:production?).and_return(true)
      end

      context 'when the server is in production' do
        before do
          allow(LoginGov::Hostdata).to receive(:domain).and_return('login.gov')
        end

        it 'does not prefill codes' do
          expect(FeatureManagement.prefill_otp_codes?).to eq(false)
        end
      end

      context 'when the server is in sandbox' do
        before do
          allow(LoginGov::Hostdata).to receive(:domain).and_return('identitysandbox.gov')
        end

        it 'prefills codes' do
          expect(FeatureManagement.prefill_otp_codes?).to eq(true)
        end
      end
    end

    context 'when SMS sending is enabled' do
      before { allow(FeatureManagement).to receive(:telephony_test_adapter?).and_return(false) }

      it 'returns false in development mode' do
        allow(Rails.env).to receive(:development?).and_return(true)

        expect(FeatureManagement.prefill_otp_codes?).to eq(false)
      end

      it 'returns false in non-development mode' do
        allow(Rails.env).to receive(:development?).and_return(false)

        expect(FeatureManagement.prefill_otp_codes?).to eq(false)
      end

      it 'returns false in production mode when server is pt' do
        allow(Rails.env).to receive(:production?).and_return(true)
        allow(Figaro.env).to receive(:domain_name).and_return('idp.pt.login.gov')

        expect(FeatureManagement.prefill_otp_codes?).to eq(false)
      end
    end
  end

  describe '#use_kms?' do
    context 'when enabled' do
      before do
        allow(Figaro.env).to receive(:use_kms).and_return('true')
      end

      it 'enables the feature' do
        expect(FeatureManagement.use_kms?).to eq(true)
      end
    end
  end

  describe '#use_dashboard_service_providers?' do
    context 'when enabled' do
      before do
        allow(Figaro.env).to receive(:use_dashboard_service_providers).and_return('true')
      end

      it 'enables the feature' do
        expect(FeatureManagement.use_dashboard_service_providers?).to eq(true)
      end
    end

    context 'when disabled' do
      before do
        allow(Figaro.env).to receive(:use_dashboard_service_providers).and_return('false')
      end

      it 'disables the feature' do
        expect(FeatureManagement.use_dashboard_service_providers?).to eq(false)
      end
    end
  end

  describe '#reveal_usps_code?' do
    context 'server domain name is dev, qa, or int' do
      it 'returns true' do
        %w[idp.dev.login.gov idp.int.login.gov idp.qa.login.gov].each do |domain|
          allow(Figaro.env).to receive(:domain_name).and_return(domain)

          expect(FeatureManagement.reveal_usps_code?).to eq(true)
        end
      end
    end

    context 'Rails env is development' do
      it 'returns true' do
        allow(Rails.env).to receive(:development?).and_return(true)

        expect(FeatureManagement.reveal_usps_code?).to eq(true)
      end
    end

    context 'Rails env is not development and server is not dev, qa, or int' do
      it 'returns false' do
        allow(Rails.env).to receive(:development?).and_return(false)
        allow(Figaro.env).to receive(:domain_name).and_return('foo.login.gov')

        expect(FeatureManagement.reveal_usps_code?).to eq(false)
      end
    end
  end

  describe '.fake_banner_mode?' do
    context 'when in the production environment: secure.login.gov, idp.staging.login.gov' do
      it 'does not display the fake banner' do
        allow(LoginGov::Hostdata).to receive(:domain).and_return('login.gov')
        allow(Rails.env).to receive(:production?).and_return(true)
        expect(FeatureManagement.fake_banner_mode?).to eq(false)
      end
    end

    context 'when the in the sandbox environment: identitysandbox.gov' do
      it 'displays the fake banner' do
        allow(LoginGov::Hostdata).to receive(:domain).and_return('identitysandbox.gov')
        allow(Rails.env).to receive(:production?).and_return(true)
        expect(FeatureManagement.fake_banner_mode?).to eq(true)
      end
    end

    context 'when the host is not secure.login.gov and the Rails env is not in production' do
      it 'does not display the fake banner' do
        allow(LoginGov::Hostdata).to receive(:domain).and_return(nil)
        allow(Rails.env).to receive(:production?).and_return(false)
        expect(FeatureManagement.fake_banner_mode?).to eq(false)
      end
    end
  end

  describe 'piv/cac feature' do
    describe '#identity_pki_disabled?' do
      context 'when enabled' do
        before(:each) do
          allow(Figaro.env).to receive(:identity_pki_disabled) { 'true' }
        end

        it 'has the feature disabled' do
          expect(FeatureManagement.identity_pki_disabled?).to be_truthy
        end
      end

      context 'when disabled' do
        before(:each) do
          allow(Figaro.env).to receive(:identity_pki_disabled) { 'false' }
        end

        it 'has the feature disabled' do
          expect(FeatureManagement.identity_pki_disabled?).to be_falsey
        end
      end
    end

    describe '#development_and_identity_pki_disabled?' do
      context 'in development environment' do
        before(:each) do
          allow(Rails.env).to receive(:development?).and_return(true)
        end

        context 'identity_pki disabled' do
          it 'returns true' do
            allow(Figaro.env).to receive(:identity_pki_disabled) { 'true' }
            expect(FeatureManagement.development_and_identity_pki_disabled?).to be_truthy
          end
        end

        context 'identity_pki not disabled' do
          it 'returns false' do
            allow(Figaro.env).to receive(:identity_pki_disabled) { 'false' }
            expect(FeatureManagement.development_and_identity_pki_disabled?).to be_falsey
          end
        end
      end

      context 'in production environment' do
        before(:each) do
          allow(Rails.env).to receive(:production?).and_return(true)
          allow(Rails.env).to receive(:development?).and_return(false)
        end

        context 'identity_pki disabled' do
          it 'returns false' do
            allow(Figaro.env).to receive(:identity_pki_disabled) { 'true' }
            expect(FeatureManagement.development_and_identity_pki_disabled?).to be_falsey
          end
        end

        context 'identity_pki not disabled' do
          it 'returns false' do
            allow(Figaro.env).to receive(:identity_pki_disabled) { 'false' }
            expect(FeatureManagement.development_and_identity_pki_disabled?).to be_falsey
          end
        end
      end
    end

    describe '#recaptcha_enabled?' do
      context 'when recaptcha is enabled 100 percent' do
        before do
          allow(Figaro.env).to receive(:recaptcha_enabled_percent).and_return('100')
        end

        it 'enables the feature when the session is new' do
          session = {}
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(true)
        end

        it 'enables the feature when the session is old' do
          session = {}
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(true)
          expect(FeatureManagement.recaptcha_enabled?(session, false)).to eq(true)
        end
      end

      context 'when recaptcha is enabled 0 percent' do
        before do
          allow(Figaro.env).to receive(:recaptcha_enabled_percent).and_return('0')
        end

        it 'disables the feature when the session is new' do
          session = {}
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(false)
        end

        it 'disables the feature when the session is old' do
          session = {}
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(false)
          expect(FeatureManagement.recaptcha_enabled?(session, false)).to eq(false)
        end
      end

      context 'when recaptcha is enabled 50 percent' do
        before do
          allow(Figaro.env).to receive(:recaptcha_enabled_percent).and_return('50')
        end

        it 'enables the feature when the session is new and random number is 70' do
          session = {}
          allow(SecureRandom).to receive(:random_number).and_return(70)
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(true)
        end

        it 'disables the feature when the session is new and random number is 30' do
          session = {}
          allow(SecureRandom).to receive(:random_number).and_return(30)
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(false)
        end

        it 'enables the feature when the session is old and the random number is 70' do
          session = {}
          allow(SecureRandom).to receive(:random_number).and_return(70)
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(true)
          expect(FeatureManagement.recaptcha_enabled?(session, false)).to eq(true)
        end

        it 'disables the feature when the session is old and the random number is 30' do
          session = {}
          allow(SecureRandom).to receive(:random_number).and_return(30)
          expect(FeatureManagement.recaptcha_enabled?(session, true)).to eq(false)
          expect(FeatureManagement.recaptcha_enabled?(session, false)).to eq(false)
        end
      end
    end
  end

  describe '#disallow_all_web_crawlers?' do
    it 'returns true when Figaro setting is true' do
      allow(Figaro.env).to receive(:disallow_all_web_crawlers) { 'true' }

      expect(FeatureManagement.disallow_all_web_crawlers?).to eq(true)
    end

    it 'returns false when Figaro setting is false' do
      allow(Figaro.env).to receive(:disallow_all_web_crawlers) { 'false' }

      expect(FeatureManagement.disallow_all_web_crawlers?).to eq(false)
    end
  end

  describe '#disallow_ial2_recovery?' do
    it 'returns true when Figaro setting is true' do
      allow(Figaro.env).to receive(:disallow_ial2_recovery) { 'true' }

      expect(FeatureManagement.disallow_ial2_recovery?).to eq(true)
    end

    it 'returns false when Figaro setting is false' do
      allow(Figaro.env).to receive(:disallow_ial2_recovery) { 'false' }

      expect(FeatureManagement.disallow_ial2_recovery?).to eq(false)
    end
  end

  describe '#identity_pki_local_dev?' do
    context 'when in development mode' do
      before(:each) do
        allow(Rails.env).to receive(:development?).and_return(true)
      end

      it 'returns true when Figaro setting is true' do
        allow(Figaro.env).to receive(:identity_pki_local_dev) { 'true' }

        expect(FeatureManagement.identity_pki_local_dev?).to eq(true)
      end

      it 'returns false when Figaro setting is false' do
        allow(Figaro.env).to receive(:identity_pki_local_dev) { 'false' }

        expect(FeatureManagement.identity_pki_local_dev?).to eq(false)
      end
    end

    context 'when in non-development mode' do
      before(:each) do
        allow(Rails.env).to receive(:development?).and_return(false)
      end

      it 'returns false when Figaro setting is true' do
        allow(Figaro.env).to receive(:identity_pki_local_dev) { 'true' }

        expect(FeatureManagement.identity_pki_local_dev?).to eq(false)
      end

      it 'returns false when Figaro setting is false' do
        allow(Figaro.env).to receive(:identity_pki_local_dev) { 'false' }

        expect(FeatureManagement.identity_pki_local_dev?).to eq(false)
      end
    end
  end

  describe '#document_capture_async_uploads_enabled?' do
    it 'returns true when Figaro presigned S3 URL setting is true' do
      allow(Figaro.env).to receive(:doc_auth_enable_presigned_s3_urls) { 'true' }

      expect(FeatureManagement.document_capture_async_uploads_enabled?).to eq(true)
    end

    it 'returns false when Figaro presigned S3 URL setting is false' do
      allow(Figaro.env).to receive(:doc_auth_enable_presigned_s3_urls) { 'false' }

      expect(FeatureManagement.document_capture_async_uploads_enabled?).to eq(false)
    end
  end

  describe 'log_to_stdout?' do
    context 'outside the test environment' do
      before { allow(Rails.env).to receive(:test?).and_return(false) }

      it 'returns true when enabled' do
        allow(Figaro.env).to receive(:log_to_stdout).and_return('true')

        expect(FeatureManagement.log_to_stdout?).to eq(true)
      end

      it 'returns false when disabled' do
        allow(Figaro.env).to receive(:log_to_stdout).and_return('true')

        expect(FeatureManagement.log_to_stdout?).to eq(true)
      end
    end

    context 'in the test environment' do
      it 'always returns true' do
        allow(Figaro.env).to receive(:log_to_stdout).and_return('true')
        expect(FeatureManagement.log_to_stdout?).to eq(false)

        allow(Figaro.env).to receive(:log_to_stdout).and_return('false')
        expect(FeatureManagement.log_to_stdout?).to eq(false)
      end
    end
  end
end
