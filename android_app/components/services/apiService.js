import StorageService from './storageService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 12000;

const normalizeUrl = (value) => String(value || '').trim().replace(/\/$/, '');

const request = async (path, options = {}) => {
  try {
    const baseUrl = normalizeUrl(API_BASE_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${baseUrl}${path}`, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(optionHeaders || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Request failed',
        ...data,
      };
    }

    return data;
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return {
      success: false,
      message: isTimeout
        ? 'Request timeout. Backend is slow/unreachable from phone network.'
        : 'Unable to connect to backend using configured API base URL.',
      error: error?.message,
      baseUrl: normalizeUrl(API_BASE_URL),
      path,
    };
  }
};

const withAuth = async () => {
  const token = await StorageService.getAuthToken();
  if (!token) {
    throw new Error('No auth token found');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

class AuthService {
  static async authenticateFarmer(username, password) {
    try {
      return await request('/auth/farmer/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch (error) {
      console.error('Farmer authentication error:', error);
      throw error;
    }
  }

  static async authenticateSahayak(sahayakId, password) {
    try {
      return await request('/auth/sahayak/login', {
        method: 'POST',
        body: JSON.stringify({
          sahayakId: String(sahayakId || '').trim().toUpperCase(),
          password,
        }),
      });
    } catch (error) {
      console.error('Sahayak authentication error:', error);
      throw error;
    }
  }

  static async checkUserExists() {
    return { exists: false, userData: null };
  }
}

class KYCService {
  static async sendAadhaarOTP(aadhaarNumber) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
        message: `OTP sent to Aadhaar-linked mobile for ${aadhaarNumber}`,
      };
    } catch (error) {
      console.error('Send Aadhaar OTP error:', error);
      throw error;
    }
  }

  static async verifyAadhaarOTP(transactionId, otp) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (String(otp) !== '654321') {
        return {
          success: false,
          message: 'Invalid Aadhaar OTP. Use 654321 for testing',
        };
      }

      return {
        success: true,
        transactionId,
        userData: {
          name: 'Verified User',
          fatherName: 'Verified Father Name',
          address: 'Verified Address',
          aadhaarNumber: '************1234',
        },
      };
    } catch (error) {
      console.error('Verify Aadhaar OTP error:', error);
      throw error;
    }
  }
}

class SahayakService {
  static async getSahayakFarmers() {
    try {
      const headers = await withAuth();
      return await request('/sahayak/farmers', { headers });
    } catch (error) {
      console.error('Get sahayak farmers error:', error);
      throw error;
    }
  }

  static async onboardNewFarmer(_token, farmerData) {
    try {
      const headers = await withAuth();
      return await request('/sahayak/onboard', {
        method: 'POST',
        headers,
        body: JSON.stringify(farmerData),
      });
    } catch (error) {
      console.error('Onboard farmer error:', error);
      throw error;
    }
  }

  static async completeKYC(_token, farmerId, aadhaarNumber) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}/kyc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ aadhaarNumber }),
      });
    } catch (error) {
      console.error('Complete KYC error:', error);
      throw error;
    }
  }

  static async registerLand(_token, farmerId, landData) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}/land`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ landData }),
      });
    } catch (error) {
      console.error('Register land error:', error);
      throw error;
    }
  }

  static async getFarmerDetails(_token, farmerId) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}`, { headers });
    } catch (error) {
      console.error('Get farmer details error:', error);
      throw error;
    }
  }

  static async setFarmerPassword(_token, farmerId, password) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}/set-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password }),
      });
    } catch (error) {
      console.error('Set farmer password error:', error);
      throw error;
    }
  }

  static async getFarmerDevices(_token, farmerId) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}/devices`, { headers });
    } catch (error) {
      console.error('Get farmer devices error:', error);
      throw error;
    }
  }

  static async saveFarmerDevices(_token, farmerId, devices) {
    try {
      const headers = await withAuth();
      return await request(`/sahayak/farmer/${farmerId}/devices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ devices }),
      });
    } catch (error) {
      console.error('Save farmer devices error:', error);
      throw error;
    }
  }
}

class FarmerService {
  static async getFarmerStatus() {
    try {
      const headers = await withAuth();
      return await request('/farmer/status', { headers });
    } catch (error) {
      console.error('Get farmer status error:', error);
      throw error;
    }
  }

  static async getFarmerProfile() {
    try {
      const headers = await withAuth();
      return await request('/farmer/profile', { headers });
    } catch (error) {
      console.error('Get farmer profile error:', error);
      throw error;
    }
  }
}

class LandService {
  static async getLandBuckets() {
    return {
      success: true,
      buckets: [],
    };
  }

  static async searchLand() {
    return {
      success: false,
      message: 'Land search API is not configured yet',
    };
  }
}

let CURRENT_APPLICATION = null;

class ApplicationService {
  static async claimLands(claimData) {
    const applicationId = `app_${Date.now()}`;
    const currentDate = new Date().toISOString().split('T')[0];

    CURRENT_APPLICATION = {
      success: true,
      status: 'SUBMITTED',
      applicationId,
      submittedDate: currentDate,
      lastUpdated: currentDate,
      totalLands: (claimData?.claimedBuckets?.length || 0) + (claimData?.addedLands?.length || 0),
      claimedBuckets: claimData?.claimedBuckets || [],
      addedLands: claimData?.addedLands || [],
    };

    return {
      success: true,
      applicationId,
      message: 'Land claim application submitted successfully',
      totalLands: CURRENT_APPLICATION.totalLands,
    };
  }

  static async getApplicationStatus() {
    if (!CURRENT_APPLICATION) {
      return {
        success: false,
        message: 'No application found',
        code: 'NO_APPLICATION',
      };
    }

    return CURRENT_APPLICATION;
  }

  static resetDemoData() {
    CURRENT_APPLICATION = null;
  }
}

export { AuthService, KYCService, FarmerService, SahayakService, LandService, ApplicationService };
