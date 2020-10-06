module Idv
  class ApiDocumentVerificationForm
    include ActiveModel::Model
    include ActionView::Helpers::TranslationHelper

    validates_presence_of :encryption_key
    validate :validate_image_urls
    validates_presence_of :document_capture_session

    validate :throttle_if_rate_limited

    def initialize(params, liveness_checking_enabled:)
      @params = params
      @liveness_checking_enabled = liveness_checking_enabled
      @readable = {}
    end

    def submit
      throttled_else_increment

      FormResponse.new(
        success: valid?,
        errors: errors.messages,
        extra: {
          remaining_attempts: remaining_attempts,
        },
      )
    end

    def status
      return :ok if valid?
      return :too_many_requests if errors.key?(:limit)
      :bad_request
    end

    def remaining_attempts
      Throttler::RemainingCount.call(document_capture_session.user_id, :idv_acuant)
    end

    def liveness_checking_enabled?
      @liveness_checking_enabled
    end

    def document_capture_session_uuid
      params[:document_capture_session_uuid]
    end

    def document_capture_session
      @document_capture_session ||= DocumentCaptureSession.find_by(
        uuid: document_capture_session_uuid,
      )
    end

    private

    attr_reader :params

    def encryption_key
      params[:encryption_key]
    end

    def valid_url?(uri)
      URI.parse(uri) && uri.host
    rescue URI::InvalidURIError
      false
    end

    def throttle_if_rate_limited
      return unless @throttled
      errors.add(:limit, t('errors.doc_auth.acuant_throttle'))
    end

    def throttled_else_increment
      @throttled = Throttler::IsThrottledElseIncrement.call(
        document_capture_session.user_id,
        :idv_acuant,
      )
    end

    def validate_image_urls
      errors.add(:front_image_url, t('doc_auth.errors.not_a_file')) if valid_url?(:front_image_url)
      errors.add(:back_image_url, t('doc_auth.errors.not_a_file')) if valid_url?(:back_image_url)
      return if valid_url?(:selfie_image_url)
      errors.add(:back_image_url, t('doc_auth.errors.not_a_file')) if liveness_checking_enabled?
    end
  end
end